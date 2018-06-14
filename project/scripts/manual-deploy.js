// in truffle environment

/* eslint-disable */
const fs = require("fs");
const path = require("path");
const moment = require("moment");
const get = require("lodash/get");
const ethUtils = require("ethereumjs-util");
const validate = require("tokyo-schema").default;
parseUnixTimestamp = require("./lib/utils").parseUnixTimestamp;

const BigNumber = web3.BigNumber;
const {toBuffer, setLengthLeft, addHexPrefix, isValidAddress} = ethUtils;

KYC = KYC;
Vault = MultiHolderVault;
Locker = Locker;
Multisig = MultiSigWallet;
Token = AlphaconCustomToken;
Crowdsale = AlphaconCrowdsale;

/**
  Mainnet

  kyc = KYC.at("0xd6b9e8f3f0d06ce286ae07801e44eacbe86155ef");
  vault = Vault.at("0x8a07174804fa1ffedba4a67b0f9be0ce3844dcae");
  token = Token.at("0x454b9f249bc1492ee995793bbc3e57b830f1a5e9");
  multisigs = ["0x31e0bad1c91a49ca863e7fc63b53dc03441bbf2f", "0xacfd6316b9d9a91d38ce5a7b0b1114e0764410b6", "0x6a8af691a0842d2870722fb8bddd99d491a9ee45", "0x34113da989f72076c7e24a8c9f6c854a60901003", "0x6690005766cab3c3eab6d5841b2d63fc73e570ba", "0x72e0d12630904d5952d673b7ae286e260d9fae11"].map(Multisig.at);
  locker = Locker.at("0x0b97e04b413da101b340dd9ed07e0b063e72bc75");
  crowdsale = Crowdsale.at("0xb9eb59dd4bc2aab1ce475a9261988077973e7ecd");


  Ropsten

  token = Token.at("0x195ee6b141b386a209de18b146bdbfbbd57dbf68");
  kyc = KYC.at("0xd6b9e8f3f0d06ce286ae07801e44eacbe86155ef");
  vault = Vault.at("0xb308fdd7bdc83e4e7276c090ff7599f52e4429f3");
  locker = Locker.at("0x77a3bee60388e74b48a07f2454a31b62c39ead33");
  crowdsale = Crowdsale.at("0x4e2219830009263aa00bf3153a151b8f17f9ad55");
  multisigs = ["0xb3e55e9b0d388907fe2c14fd5138ebf05a7139a0", "0x9c129963097f204623cde8cc212a1b9633f05eb9", "0xee6f69e4e59d54282453317d703bc744b7bba9ab", "0xd8906d8e7d864463240161a366af6cb03fa2ea2c", "0x2920f5a51f4a4988f5ec99b79139c41d28377b1b", "0x58e056b8e12cb9fc0e21b38436e63e8367ff31a8"].map(Multisig.at);



  address.kyc = kyc.address;
  address.vault = vault.address;
  address.token = token.address;
  address.locker = locker.address;
  address.crowdsale = crowdsale.address;
  address.multisigs = multisigs.map(m => m.address);

 */

// helper functions
toLeftPaddedBuffer = (v) => { val = addHexPrefix(new BigNumber(v).toString(16)); buf = toBuffer(val); hex = setLengthLeft(buf, 32).toString("hex"); return addHexPrefix(hex); };
logAddress = caption => (i) => { console.log(caption, i.address); };

// Main scripts
address = {};
const { value, error } = validate(require("./input.json"));

input = value;

data = { address, input };

let kyc, vault, locker, multisigs, token, crowdsale;

KYC.new().then(i => kyc = i).then(logAddress("KYC:"));
Vault.new(get(data, "input.sale.new_token_owner"), get(data, "input.sale.coeff")).then(i => vault = i).then(logAddress("Vault:"));
Token.new().then(i => token = i).then(logAddress("Token:"));
address.kyc = kyc.address;
address.vault = vault.address;
address.token = token.address;

Multisig.new(["0xe7bd92ff15deedd786074731a920c685678cd372", "0x2264c62d3cce1f2c998bd5cf441d8e13215fcb1b", "0x76922caa7f411aebe521043ae2ef6b0bf16e73d4"], 2).then(i => multisig0 = i).then(logAddress("Multisig0:"))
Multisig.new(["0x03dd7df0944deb60af9820211fdef1c521599729", "0xfc070f03c54dc8cbdaa04fa0f33e6a88778a3ea2", "0x00329011936fdc2e04de08a96d005283659a507e"], 2).then(i => multisig1 = i).then(logAddress("Multisig1:"))
Multisig.new(["0x53a3b176c33496fe26ddbbfe0d85be4f76788c15", "0x6bebd990baa4b75f4771bb082f927f58fe992b0d", "0x394b3ca38b9192dcb8988fc342a0271461ca3170"], 2).then(i => multisig2 = i).then(logAddress("Multisig2:"))
Multisig.new(["0xf6378b66f069d5ab0421e4f274ae1e41be7b3b1e", "0xed278e538592410932059bdf8b6b41d809422508", "0x64e30dd5af85cd860feffbc867100939289f350c"], 2).then(i => multisig3 = i).then(logAddress("Multisig3:"))
Multisig.new(["0x87de63099c76398bbc1dd614a079b0aab3e0a79b", "0x21522a084e96ef3f20bf070e3ce6ad253dbf59e0", "0x6802a3f6cd03e7139e1d7ca5b4f7850fb0915cb7"], 2).then(i => multisig4 = i).then(logAddress("Multisig4:"))
Multisig.new(["0xb8b3e1750d77d211fd0e07c8c813a95dc289ae69", "0x3736a7e5e2f6b01a3cf4faa85229b31dfd9aa5bb", "0xa0fe3d08b49586bc20dbbe9e44d200e54532c511"], 2).then(i => multisig5 = i).then(logAddress("Multisig5:"))

multisigs = [multisig0, multisig1,multisig2,multisig3,multisig4,multisig5];
address.multisigs = multisigs.map(m => m.address);
fs.writeFileSync(path.resolve(__dirname, "./multisigs.json"), JSON.stringify(address.multisigs));


Locker.new(get(data, "address.token"),get(data, "input.sale.coeff"),[get(data, "input.locker.beneficiaries.0.address")],[get(data, "input.locker.beneficiaries.0.ratio")]).then(i => locker = i).then(logAddress("Locker:"));
address.locker = locker.address;


Crowdsale.new([get(data, "input.sale.coeff"),get(data, "address.token"),get(data, "input.sale.valid_purchase.block_interval"),get(data, "address.kyc"),get(data, "input.sale.stages.length")].map(toLeftPaddedBuffer)).then(i => crowdsale = i).then(logAddress("Crowdsale:"));
address.crowdsale = crowdsale.address;

const tokenDistributions = get(data, "input.sale.distribution.token");
const lockerRatios = tokenDistributions.filter(t => t.token_holder === "locker")[0].token_ratio;
const crowdsaleRatio = tokenDistributions.filter(t => t.token_holder === "crowdsale")[0].token_ratio;


const initArgs = [new BigNumber(get(data, "input.sale.start_time")),new BigNumber(get(data, "input.sale.end_time")),new BigNumber(get(data, "input.sale.rate.base_rate")),new BigNumber(get(data, "input.sale.max_cap")),new BigNumber(get(data, "input.sale.min_cap")),new BigNumber(crowdsaleRatio),get(data, "address.vault"),get(data, "address.locker"),get(data, "input.sale.new_token_owner")];
crowdsale.init(initArgs.map(toLeftPaddedBuffer));


const etherHolderAddresses = get(data, "input.sale.distribution.ether").map(({ether_holder}) => {if (isValidAddress(ether_holder)) return ether_holder;if (ether_holder.includes("multisig")) {const idx = Number(ether_holder.split("multisig")[1]);if (!isValidAddress(address.multisigs[idx])) throw new Error("Invalid multisig address", address.multisigs[idx]);return address.multisigs[idx];}});
const etherHolderRatios = get(data, "input.sale.distribution.ether").map(e => e.ether_ratio);

vault.initHolders(etherHolderAddresses,etherHolderRatios);


const tokenHolderAddresses = get(data, "input.sale.distribution.token").map(({token_holder}) => {if (isValidAddress(token_holder)) return token_holder;if (token_holder === "crowdsale") return "0x00";if (token_holder === "locker") return address.locker;if (token_holder.includes("multisig")) {const idx = Number(token_holder.split("multisig")[1]);if (!isValidAddress(address.multisigs[idx])) throw new Error("Invalid multisig address", address.multisigs[idx]);return address.multisigs[idx];}});
const tokenHolderRatios = get(data, "input.sale.distribution.token").map(e => e.token_ratio);
crowdsale.initHolders(tokenHolderAddresses,tokenHolderRatios);

// done

const bonusTimeStages = [get(data, "input.sale.rate.bonus.time_bonuses.0.bonus_time_stage"),get(data, "input.sale.rate.bonus.time_bonuses.1.bonus_time_stage"),get(data, "input.sale.rate.bonus.time_bonuses.2.bonus_time_stage"),get(data, "input.sale.rate.bonus.time_bonuses.3.bonus_time_stage"),get(data, "input.sale.rate.bonus.time_bonuses.4.bonus_time_stage") ];
const bonusTimeRatios = [get(data, "input.sale.rate.bonus.time_bonuses.0.bonus_time_ratio"),get(data, "input.sale.rate.bonus.time_bonuses.1.bonus_time_ratio"),get(data, "input.sale.rate.bonus.time_bonuses.2.bonus_time_ratio"),get(data, "input.sale.rate.bonus.time_bonuses.3.bonus_time_ratio"),get(data, "input.sale.rate.bonus.time_bonuses.4.bonus_time_ratio") ];
crowdsale.setBonusesForTimes(bonusTimeStages,bonusTimeRatios);


const periodStartTimes = [get(data, "input.sale.stages.0.start_time"),get(data, "input.sale.stages.1.start_time") ];
const periodEndTimes = [get(data, "input.sale.stages.0.end_time"),get(data, "input.sale.stages.1.end_time") ];
const periodCapRatios = [get(data, "input.sale.stages.0.cap_ratio"),get(data, "input.sale.stages.1.cap_ratio") ];
const periodMaxPurchaseLimits = [get(data, "input.sale.stages.0.max_purchase_limit"),get(data, "input.sale.stages.1.max_purchase_limit") ];
const periodMinPurchaseLimits = [get(data, "input.sale.stages.0.min_purchase_limit"),get(data, "input.sale.stages.1.min_purchase_limit") ];
const periodKycs = [get(data, "input.sale.stages.0.kyc"),get(data, "input.sale.stages.1.kyc") ];
crowdsale.initStages(periodStartTimes,periodEndTimes,periodCapRatios,periodMaxPurchaseLimits,periodMinPurchaseLimits,periodKycs,);


const release0Times = [get(data, "input.locker.beneficiaries.0.release.0.release_time"),get(data, "input.locker.beneficiaries.0.release.1.release_time"),get(data, "input.locker.beneficiaries.0.release.2.release_time"),get(data, "input.locker.beneficiaries.0.release.3.release_time"),get(data, "input.locker.beneficiaries.0.release.4.release_time"),get(data, "input.locker.beneficiaries.0.release.5.release_time"),get(data, "input.locker.beneficiaries.0.release.6.release_time"),get(data, "input.locker.beneficiaries.0.release.7.release_time") ];
const release0Ratios = [get(data, "input.locker.beneficiaries.0.release.0.release_ratio"),get(data, "input.locker.beneficiaries.0.release.1.release_ratio"),get(data, "input.locker.beneficiaries.0.release.2.release_ratio"),get(data, "input.locker.beneficiaries.0.release.3.release_ratio"),get(data, "input.locker.beneficiaries.0.release.4.release_ratio"),get(data, "input.locker.beneficiaries.0.release.5.release_ratio"),get(data, "input.locker.beneficiaries.0.release.6.release_ratio"),get(data, "input.locker.beneficiaries.0.release.7.release_ratio") ];

locker.lock(get(data, "input.locker.beneficiaries.0.address"),get(data, "input.locker.beneficiaries.0.is_straight"),release0Times,release0Ratios,)

vault.transferOwnership(crowdsale.address);
locker.transferOwnership(crowdsale.address);
token.transferOwnership(crowdsale.address);
