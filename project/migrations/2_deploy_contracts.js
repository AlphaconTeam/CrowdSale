const moment = require("moment");
const get = require("lodash/get");
const ethUtils = require("ethereumjs-util");
const validate = require("tokyo-schema").default;

const BigNumber = web3.BigNumber;
const { toBuffer, setLengthLeft, addHexPrefix, isValidAddress } = ethUtils;

/**
 * Contract Artifacts
 */
const KYC = artifacts.require("./KYC.sol");
const Vault = artifacts.require("./MultiHolderVault.sol");
const Locker = artifacts.require("./Locker.sol");
const Multisig = artifacts.require("./MultiSigWallet.sol");
const Token = artifacts.require("./AlphaconToken.sol");
const Crowdsale = artifacts.require("./AlphaconCrowdsale.sol");

module.exports = async function (deployer, network, accounts) {
  console.log(accounts)
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
      "0x0000000000000000000000000000000000000001",
      1000
    ],
    [
      Token,
      // token arguments...
      
    ]
  ]).then(async () => {
    kyc = await KYC.deployed();
    vault = await Vault.deployed();
    token = await Token.deployed();

    address.kyc = kyc.address;
    address.vault = vault.address;
    address.token = token.address;
  }).then(async () => {
    multisigs = await Promise.all([
      Multisig.new(["0x0000000000000000000000000000000000000002", "0x0000000000000000000000000000000000000003", "0x0000000000000000000000000000000000000004"], 2),
      Multisig.new(["0x0000000000000000000000000000000000000005", "0x0000000000000000000000000000000000000006", "0x0000000000000000000000000000000000000007"], 2),
      Multisig.new(["0x0000000000000000000000000000000000000008", "0x0000000000000000000000000000000000000009", "0x000000000000000000000000000000000000000a"], 2),
      Multisig.new(["0x000000000000000000000000000000000000000b", "0x000000000000000000000000000000000000000c", "0x000000000000000000000000000000000000000d"], 2),
      Multisig.new(["0x000000000000000000000000000000000000000e", "0x000000000000000000000000000000000000000f", "0x0000000000000000000000000000000000000010"], 2),
      Multisig.new(["0x0000000000000000000000000000000000000011", "0x0000000000000000000000000000000000000012", "0x0000000000000000000000000000000000000013"], 2)
    ]);

    address.multisigs = multisigs.map(m => m.address);
    console.log("Multisigs :", address.multisigs.join(", "));
  }).then(async () => deployer.deploy([
    [
      Locker,
      get(data, "address.token"),
        new BigNumber("1000"),
        ["0x0000000000000000000000000000000000000014"],
        [new BigNumber("1000")]
    ],
  ])).then(async () => {
    locker = await Locker.deployed();

    address.locker = locker.address;
  }).then(() => deployer.deploy([
    [
      Crowdsale,
      [
        get(data, "address.token"), // address.token
        new BigNumber("5"), // input.sale.valid_purchase.block_interval
        get(data, "address.kyc"), // address.kyc
        new BigNumber("2"), // input.sale.stages_length
      ].map(toLeftPaddedBuffer)
    ]
  ])).then(async () => {
    crowdsale = await Crowdsale.deployed();

    address.crowdsale = crowdsale.address;
  }).then(async () => {
    
    const tokenDistributions = get(data, "input.sale.distribution.token");
    const lockerRatios = tokenDistributions
      .filter(t => t.token_holder === "locker")[0].token_ratio;
    const crowdsaleRatio = tokenDistributions
      .filter(t => t.token_holder === "crowdsale")[0].token_ratio;
  
    const initArgs = [
      new BigNumber(get(data, "input.sale.start_time")),
      new BigNumber(get(data, "input.sale.end_time")),
      new BigNumber(get(data, "input.sale.rate.base_rate")),
      new BigNumber(get(data, "input.sale.coeff")),
      new BigNumber(get(data, "input.sale.max_cap")),
      new BigNumber(get(data, "input.sale.min_cap")),
      new BigNumber(lockerRatios),
      new BigNumber(crowdsaleRatio),
      get(data, "address.vault"),
      get(data, "address.locker"),
      get(data, "input.sale.new_token_owner")
    ];
    
    await crowdsale.init(initArgs.map(toLeftPaddedBuffer));

    const holderAddresses = get(data, "input.sale.distribution.ether").map(({ether_holder}) => {
      if (isValidAddress(ether_holder)) return ether_holder;
      if (ether_holder.includes("multisig")) {
        const idx = Number(ether_holder.split("multisig")[1]);
        if (!isValidAddress(address.multisigs[idx])) throw new Error("Invalid multisig address", address.multisigs[idx]);
    
        return address.multisigs[idx];
      }
    });
    const holderRatios = get(data, "input.sale.distribution.ether").map(e => e.ether_ratio);
    
    await vault.initHolders(
      holderAddresses,
      holderRatios,
    );
    
    const bonusTimes = [ 1528992000, 1529337600, 1529683200, 1530028800, 1530374400 ];
    const bonusTimeValues = [ 300, 200, 150, 100, 0 ];
      
    const bonusAmounts = [  ];
    const bonusAmountValues = [  ];

    await crowdsale.setBonusesForTimes(
      bonusTimes,
      bonusTimeValues,
    );

    await crowdsale.setBonusesForAmounts(
      bonusAmounts,
      bonusAmountValues,
    );

    const periodStartTimes = [ 1525708800, 1528992000 ];
    const periodEndTimes = [ 1528992000, 1530374400 ];
    const periodCapRatios = [ 0, 1000 ];
    const periodMaxPurchaseLimits = [ 0, 1e+21 ];
    const periodMinPurchaseLimits = [ 0, 100000000000000000 ];
    const periodKycs = [ true, true ];

    await crowdsale.initStages(
      periodStartTimes,
      periodEndTimes,
      periodCapRatios,
      periodMaxPurchaseLimits,
      periodMinPurchaseLimits,
      periodKycs,
    );

    const release1Times = [ 1561910400, 1572451200, 1582992000, 1593532800, 1604073600, 1614528000, 1625068800, 1635609600 ];
    const release1Ratios = [ 300, 400, 500, 600, 700, 800, 900, 1000 ];

    await locker.lock(
      "0x0000000000000000000000000000000000000014",
      false,
      release1Times,
      release1Ratios,
    );
    
  }).then(async () => {
    // transfer ownerships to crowdsale
    await Promise.all([
      vault.transferOwnership(crowdsale.address),
      locker.transferOwnership(crowdsale.address),
      token.transferOwnership(crowdsale.address),
    ]);

  });
};

function getInput() {
  return JSON.parse('{"project_name":"Alphacon","token":{"token_type":{"is_minime":false},"token_option":{"burnable":true,"pausable":true,"no_mint_after_sale":true},"token_name":"Alphacon Token","token_symbol":"ALP","decimals":18},"sale":{"max_cap":"37500000000000000000000","min_cap":"5000000000000000000000","start_time":"2018/05/07 16:00:00","end_time":"2018/06/30 16:00:00","coeff":"1000","rate":{"is_static":false,"base_rate":"200000","bonus":{"use_time_bonus":true,"use_amount_bonus":false,"time_bonuses":[{"bonus_time_stage":"2018/06/14 16:00:00","bonus_time_ratio":"300"},{"bonus_time_stage":"2018/06/18 16:00:00","bonus_time_ratio":"200"},{"bonus_time_stage":"2018/06/22 16:00:00","bonus_time_ratio":"150"},{"bonus_time_stage":"2018/06/26 16:00:00","bonus_time_ratio":"100"},{"bonus_time_stage":"2018/06/30 16:00:00","bonus_time_ratio":"0"}],"amount_bonuses":[]}},"distribution":{"token":[{"token_holder":"crowdsale","token_ratio":"300"},{"token_holder":"locker","token_ratio":"100"},{"token_holder":"multisig0","token_ratio":"200"},{"token_holder":"multisig1","token_ratio":"200"},{"token_holder":"multisig2","token_ratio":"200"}],"ether":[{"ether_holder":"multisig3","ether_ratio":"330"},{"ether_holder":"multisig4","ether_ratio":"330"},{"ether_holder":"multisig5","ether_ratio":"330"},{"ether_holder":"0x603344CEe73C5CeE7186BD6FB15Fc6B0A8b95908","ether_ratio":"10"}]},"stages":[{"start_time":"2018/05/07 16:00:00","end_time":"2018/06/14 16:00:00","cap_ratio":"0","max_purchase_limit":"0","min_purchase_limit":"0","kyc":true},{"start_time":"2018/06/14 16:00:00","end_time":"2018/06/30 16:00:00","cap_ratio":"1000","max_purchase_limit":"1000000000000000000000","min_purchase_limit":"100000000000000000","kyc":true}],"valid_purchase":{"max_purchase_limit":"0","min_purchase_limit":"0","block_interval":5},"new_token_owner":"0x0000000000000000000000000000000000000001"},"multisig":{"use_multisig":true,"infos":[{"num_required":2,"owners":["0x0000000000000000000000000000000000000002","0x0000000000000000000000000000000000000003","0x0000000000000000000000000000000000000004"]},{"num_required":2,"owners":["0x0000000000000000000000000000000000000005","0x0000000000000000000000000000000000000006","0x0000000000000000000000000000000000000007"]},{"num_required":2,"owners":["0x0000000000000000000000000000000000000008","0x0000000000000000000000000000000000000009","0x000000000000000000000000000000000000000a"]},{"num_required":2,"owners":["0x000000000000000000000000000000000000000b","0x000000000000000000000000000000000000000c","0x000000000000000000000000000000000000000d"]},{"num_required":2,"owners":["0x000000000000000000000000000000000000000e","0x000000000000000000000000000000000000000f","0x0000000000000000000000000000000000000010"]},{"num_required":2,"owners":["0x0000000000000000000000000000000000000011","0x0000000000000000000000000000000000000012","0x0000000000000000000000000000000000000013"]}]},"locker":{"use_locker":true,"beneficiaries":[{"address":"0x0000000000000000000000000000000000000014","ratio":"1000","is_straight":false,"release":[{"release_time":"2019/06/30 16:00:00","release_ratio":"300"},{"release_time":"2019/10/30 16:00:00","release_ratio":"400"},{"release_time":"2020/02/29 16:00:00","release_ratio":"500"},{"release_time":"2020/06/30 16:00:00","release_ratio":"600"},{"release_time":"2020/10/30 16:00:00","release_ratio":"700"},{"release_time":"2021/02/28 16:00:00","release_ratio":"800"},{"release_time":"2021/06/30 16:00:00","release_ratio":"900"},{"release_time":"2021/10/30 16:00:00","release_ratio":"1000"}]}]}}');
}

function toLeftPaddedBuffer(v) {
  if (typeof v === "boolean") {
    v = Number(v);
  } else if (v instanceof BigNumber) {
    v = addHexPrefix(v.toString(16));
  }

  const buf = toBuffer(v);
  const hex = setLengthLeft(buf, 32).toString("hex");
  return addHexPrefix(hex);
}



