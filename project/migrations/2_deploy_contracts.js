const fs = require("fs");
const path = require("path");
const moment = require("moment");
const get = require("lodash/get");
const ethUtils = require("ethereumjs-util");
const validate = require("tokyo-schema").default;

const BigNumber = web3.BigNumber;
const {
  toBuffer, setLengthLeft, addHexPrefix, isValidAddress,
} = ethUtils;

/**
 * Contract Artifacts
 */
const KYC = artifacts.require("./KYC.sol");
const Vault = artifacts.require("./MultiHolderVault.sol");
const Locker = artifacts.require("./Locker.sol");
const Multisig = artifacts.require("./MultiSigWallet.sol");
const Token = artifacts.require("./AlphaconCustomToken.sol");
const Crowdsale = artifacts.require("./AlphaconCrowdsale.sol");

module.exports = async function (deployer, network, accounts) {
  console.log(accounts);
  const address = {};
  const { value, error } = validate(getInput());
  const input = value;

  const data = { address, input };

  // contract instance
  let kyc, vault, locker, multisigs, token, crowdsale;

  /**
   * Deploy contracts sequentually
   *  1. KYC / Vault / Locker / Multisigs(optional)
   *  2. Token
   *  3. Crowdsale
   *  4. Initialize contracts
   *   - transfer ownerships of vault, token, lcoker to crowdsale
   *   - Crowdsale.init()
   */

  deployer.deploy([
    KYC,
    [
      Vault,
      get(data, "input.sale.new_token_owner"),
      get(data, "input.sale.coeff"),
    ],
    [
      Token,
      // token arguments...

    ],
  ]).then(async () => {
    kyc = await KYC.deployed();
    vault = await Vault.deployed();
    token = await Token.deployed();

    address.kyc = kyc.address;
    address.vault = vault.address;
    address.token = token.address;
  }).then(async () => {
    multisigs = await Promise.all([
      Multisig.new([ "0xe7bd92ff15deedd786074731a920c685678cd372", "0x2264c62d3cce1f2c998bd5cf441d8e13215fcb1b", "0x76922caa7f411aebe521043ae2ef6b0bf16e73d4" ], 2),
      Multisig.new([ "0x03dd7df0944deb60af9820211fdef1c521599729", "0xfc070f03c54dc8cbdaa04fa0f33e6a88778a3ea2", "0x00329011936fdc2e04de08a96d005283659a507e" ], 2),
      Multisig.new([ "0x53a3b176c33496fe26ddbbfe0d85be4f76788c15", "0x6bebd990baa4b75f4771bb082f927f58fe992b0d", "0x394b3ca38b9192dcb8988fc342a0271461ca3170" ], 2),
      Multisig.new([ "0xf6378b66f069d5ab0421e4f274ae1e41be7b3b1e", "0xed278e538592410932059bdf8b6b41d809422508", "0x64e30dd5af85cd860feffbc867100939289f350c" ], 2),
      Multisig.new([ "0x87de63099c76398bbc1dd614a079b0aab3e0a79b", "0x21522a084e96ef3f20bf070e3ce6ad253dbf59e0", "0x6802a3f6cd03e7139e1d7ca5b4f7850fb0915cb7" ], 2),
      Multisig.new([ "0xb8b3e1750d77d211fd0e07c8c813a95dc289ae69", "0x3736a7e5e2f6b01a3cf4faa85229b31dfd9aa5bb", "0xa0fe3d08b49586bc20dbbe9e44d200e54532c511" ], 2),
    ]);

    address.multisigs = multisigs.map(m => m.address);
    console.log("Multisigs :", address.multisigs.join(", "));
    fs.writeFileSync(path.resolve(__dirname, "../multisigs.json"), JSON.stringify(address.multisigs));
  }).then(async () => deployer.deploy([
    [
      Locker,
      get(data, "address.token"),
      get(data, "input.sale.coeff"),
      [
        get(data, "input.locker.beneficiaries.0.address"),
      ],
      [
        get(data, "input.locker.beneficiaries.0.ratio"),
      ],
    ],
  ]))
    .then(async () => {
      locker = await Locker.deployed();

      address.locker = locker.address;
    })
    .then(() => deployer.deploy([
      [
        Crowdsale,
        [
          get(data, "input.sale.coeff"),
          get(data, "address.token"),
          get(data, "input.sale.valid_purchase.block_interval"),
          get(data, "address.kyc"),
          get(data, "input.sale.stages.length"),
        ].map(toLeftPaddedBuffer),
      ],
    ]))
    .then(async () => {
      crowdsale = await Crowdsale.deployed();

      address.crowdsale = crowdsale.address;
    })
    .then(async () => {
      const tokenDistributions = get(data, "input.sale.distribution.token");
      const lockerRatios = tokenDistributions
        .filter(t => t.token_holder === "locker")[ 0 ].token_ratio;
      const crowdsaleRatio = tokenDistributions
        .filter(t => t.token_holder === "crowdsale")[ 0 ].token_ratio;

      const initArgs = [
        new BigNumber(get(data, "input.sale.start_time")),
        new BigNumber(get(data, "input.sale.end_time")),
        new BigNumber(get(data, "input.sale.rate.base_rate")),
        new BigNumber(get(data, "input.sale.max_cap")),
        new BigNumber(get(data, "input.sale.min_cap")),
        new BigNumber(crowdsaleRatio),
        get(data, "address.vault"),
        get(data, "address.locker"),
        get(data, "input.sale.new_token_owner"),
      ];

      await crowdsale.init(initArgs.map(toLeftPaddedBuffer));

      const etherHolderAddresses = get(data, "input.sale.distribution.ether").map(({ ether_holder }) => {
        if (isValidAddress(ether_holder)) return ether_holder;
        if (ether_holder.includes("multisig")) {
          const idx = Number(ether_holder.split("multisig")[ 1 ]);
          if (!isValidAddress(address.multisigs[ idx ])) throw new Error("Invalid multisig address", address.multisigs[ idx ]);

          return address.multisigs[ idx ];
        }
      });
      const etherHolderRatios = get(data, "input.sale.distribution.ether").map(e => e.ether_ratio);

      await vault.initHolders(
        etherHolderAddresses,
        etherHolderRatios,
      );

      // done

      const tokenHolderAddresses = get(data, "input.sale.distribution.token").map(({ token_holder }) => {
        if (isValidAddress(token_holder)) return token_holder;
        if (token_holder === "crowdsale") return "0x00";
        if (token_holder === "locker") return address.locker;
        if (token_holder.includes("multisig")) {
          const idx = Number(token_holder.split("multisig")[ 1 ]);
          if (!isValidAddress(address.multisigs[ idx ])) throw new Error("Invalid multisig address", address.multisigs[ idx ]);

          return address.multisigs[ idx ];
        }
      });
      const tokenHolderRatios = get(data, "input.sale.distribution.token").map(e => e.token_ratio);

      await crowdsale.initHolders(
        tokenHolderAddresses,
        tokenHolderRatios,
      );

      const bonusTimeStages = [
        get(data, "input.sale.rate.bonus.time_bonuses.0.bonus_time_stage"),
        get(data, "input.sale.rate.bonus.time_bonuses.1.bonus_time_stage"),
        get(data, "input.sale.rate.bonus.time_bonuses.2.bonus_time_stage"),
        get(data, "input.sale.rate.bonus.time_bonuses.3.bonus_time_stage"),
        get(data, "input.sale.rate.bonus.time_bonuses.4.bonus_time_stage") ];
      const bonusTimeRatios = [
        get(data, "input.sale.rate.bonus.time_bonuses.0.bonus_time_ratio"),
        get(data, "input.sale.rate.bonus.time_bonuses.1.bonus_time_ratio"),
        get(data, "input.sale.rate.bonus.time_bonuses.2.bonus_time_ratio"),
        get(data, "input.sale.rate.bonus.time_bonuses.3.bonus_time_ratio"),
        get(data, "input.sale.rate.bonus.time_bonuses.4.bonus_time_ratio") ];

      const bonusAmountStages = [
      ];
      const bonusAmountRatios = [
      ];

      await crowdsale.setBonusesForTimes(
        bonusTimeStages,
        bonusTimeRatios,
      );

      await crowdsale.setBonusesForAmounts(
        bonusAmountStages,
        bonusAmountRatios,
      );

      const periodStartTimes = [
        get(data, "input.sale.stages.0.start_time"),
        get(data, "input.sale.stages.1.start_time") ];
      const periodEndTimes = [
        get(data, "input.sale.stages.0.end_time"),
        get(data, "input.sale.stages.1.end_time") ];
      const periodCapRatios = [
        get(data, "input.sale.stages.0.cap_ratio"),
        get(data, "input.sale.stages.1.cap_ratio") ];
      const periodMaxPurchaseLimits = [
        get(data, "input.sale.stages.0.max_purchase_limit"),
        get(data, "input.sale.stages.1.max_purchase_limit") ];
      const periodMinPurchaseLimits = [
        get(data, "input.sale.stages.0.min_purchase_limit"),
        get(data, "input.sale.stages.1.min_purchase_limit") ];
      const periodKycs = [
        get(data, "input.sale.stages.0.kyc"),
        get(data, "input.sale.stages.1.kyc") ];

      await crowdsale.initStages(
        periodStartTimes,
        periodEndTimes,
        periodCapRatios,
        periodMaxPurchaseLimits,
        periodMinPurchaseLimits,
        periodKycs,
      );

      const release0Times = [
        get(data, "input.locker.beneficiaries.0.release.0.release_time"),
        get(data, "input.locker.beneficiaries.0.release.1.release_time"),
        get(data, "input.locker.beneficiaries.0.release.2.release_time"),
        get(data, "input.locker.beneficiaries.0.release.3.release_time"),
        get(data, "input.locker.beneficiaries.0.release.4.release_time"),
        get(data, "input.locker.beneficiaries.0.release.5.release_time"),
        get(data, "input.locker.beneficiaries.0.release.6.release_time"),
        get(data, "input.locker.beneficiaries.0.release.7.release_time") ];
      const release0Ratios = [
        get(data, "input.locker.beneficiaries.0.release.0.release_ratio"),
        get(data, "input.locker.beneficiaries.0.release.1.release_ratio"),
        get(data, "input.locker.beneficiaries.0.release.2.release_ratio"),
        get(data, "input.locker.beneficiaries.0.release.3.release_ratio"),
        get(data, "input.locker.beneficiaries.0.release.4.release_ratio"),
        get(data, "input.locker.beneficiaries.0.release.5.release_ratio"),
        get(data, "input.locker.beneficiaries.0.release.6.release_ratio"),
        get(data, "input.locker.beneficiaries.0.release.7.release_ratio") ];

      await locker.lock(
        get(data, "input.locker.beneficiaries.0.address"),
        get(data, "input.locker.beneficiaries.0.is_straight"),
        release0Times,
        release0Ratios,
      );
    })
    .then(async () => {
    // transfer ownerships to crowdsale
      await Promise.all([
        vault.transferOwnership(crowdsale.address),
        locker.transferOwnership(crowdsale.address),
        token.transferOwnership(crowdsale.address),
      ]);
    });
};

function getInput() {
  return JSON.parse('{"project_name":"Alphacon","token":{"token_type":{"is_minime":false},"token_option":{"burnable":true,"pausable":true,"no_mint_after_sale":true},"token_name":"Alphacon Token","token_symbol":"ALP","use_custom_token":true,"decimals":18},"sale":{"max_cap":"37500e18","min_cap":"1e18","start_time":"2018/05/08 16:00:00","end_time":"2018/06/30 16:00:00","coeff":"1000","rate":{"is_static":false,"base_rate":"200000","bonus":{"use_time_bonus":true,"use_amount_bonus":false,"time_bonuses":[{"bonus_time_stage":"2018/06/14 16:00:00","bonus_time_ratio":"300"},{"bonus_time_stage":"2018/06/18 16:00:00","bonus_time_ratio":"200"},{"bonus_time_stage":"2018/06/22 16:00:00","bonus_time_ratio":"150"},{"bonus_time_stage":"2018/06/26 16:00:00","bonus_time_ratio":"100"},{"bonus_time_stage":"2018/06/30 16:00:00","bonus_time_ratio":"0"}],"amount_bonuses":[]}},"distribution":{"token":[{"token_holder":"crowdsale","token_ratio":"300"},{"token_holder":"locker","token_ratio":"100"},{"token_holder":"multisig0","token_ratio":"200"},{"token_holder":"multisig1","token_ratio":"200"},{"token_holder":"multisig2","token_ratio":"200"}],"ether":[{"ether_holder":"multisig3","ether_ratio":"330"},{"ether_holder":"multisig4","ether_ratio":"330"},{"ether_holder":"multisig5","ether_ratio":"330"},{"ether_holder":"0x603344cee73c5cee7186bd6fb15fc6b0a8b95908","ether_ratio":"10"}]},"stages":[{"start_time":"2018/05/08 16:00:00","end_time":"2018/06/14 16:00:00","cap_ratio":"0","max_purchase_limit":"0","min_purchase_limit":"25e18","kyc":true},{"start_time":"2018/06/14 16:00:01","end_time":"2018/06/30 16:00:00","cap_ratio":"0","max_purchase_limit":"0","min_purchase_limit":"1e17","kyc":true}],"valid_purchase":{"max_purchase_limit":"0","min_purchase_limit":"0","block_interval":5},"new_token_owner":"0xa73f8f80b0624182ed96ed0bf444165bb6a34322"},"multisig":{"use_multisig":true,"infos":[{"num_required":2,"owners":["0xe7bd92ff15deedd786074731a920c685678cd372","0x2264c62d3cce1f2c998bd5cf441d8e13215fcb1b","0x76922caa7f411aebe521043ae2ef6b0bf16e73d4"]},{"num_required":2,"owners":["0x03dd7df0944deb60af9820211fdef1c521599729","0xfc070f03c54dc8cbdaa04fa0f33e6a88778a3ea2","0x00329011936fdc2e04de08a96d005283659a507e"]},{"num_required":2,"owners":["0x53a3b176c33496fe26ddbbfe0d85be4f76788c15","0x6bebd990baa4b75f4771bb082f927f58fe992b0d","0x394b3ca38b9192dcb8988fc342a0271461ca3170"]},{"num_required":2,"owners":["0xf6378b66f069d5ab0421e4f274ae1e41be7b3b1e","0xed278e538592410932059bdf8b6b41d809422508","0x64e30dd5af85cd860feffbc867100939289f350c"]},{"num_required":2,"owners":["0x87de63099c76398bbc1dd614a079b0aab3e0a79b","0x21522a084e96ef3f20bf070e3ce6ad253dbf59e0","0x6802a3f6cd03e7139e1d7ca5b4f7850fb0915cb7"]},{"num_required":2,"owners":["0xb8b3e1750d77d211fd0e07c8c813a95dc289ae69","0x3736a7e5e2f6b01a3cf4faa85229b31dfd9aa5bb","0xa0fe3d08b49586bc20dbbe9e44d200e54532c511"]}]},"locker":{"use_locker":true,"beneficiaries":[{"address":"0x3221d1f77e05500c5dcaa3fc89ee4acee409fd0c","ratio":"1000","is_straight":false,"release":[{"release_time":"2019/06/30 16:00:00","release_ratio":"300"},{"release_time":"2019/09/30 16:00:00","release_ratio":"400"},{"release_time":"2019/12/31 16:00:00","release_ratio":"500"},{"release_time":"2020/03/31 16:00:00","release_ratio":"600"},{"release_time":"2020/06/30 16:00:00","release_ratio":"700"},{"release_time":"2020/09/30 16:00:00","release_ratio":"800"},{"release_time":"2020/12/31 16:00:00","release_ratio":"900"},{"release_time":"2021/03/31 16:00:00","release_ratio":"1000"}]}]}}');
}

function toLeftPaddedBuffer(v) {
  const val = addHexPrefix(new BigNumber(v).toString(16));
  const buf = toBuffer(val);
  const hex = setLengthLeft(buf, 32).toString("hex");
  return addHexPrefix(hex);
}
