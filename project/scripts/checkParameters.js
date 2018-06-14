// in truffle environment

/* eslint-disable */
moment = require("moment");
get = require("lodash/get");
range = require("lodash/range");
ethUtils = require("ethereumjs-util");
validate = require("tokyo-schema").default;
parseUnixTimestamp = require("./lib/utils").parseUnixTimestamp;

BigNumber = web3.BigNumber;
const {toBuffer, setLengthLeft, addHexPrefix, isValidAddress} = ethUtils;

// Contract Artifacts
Vault = MultiHolderVault;
Multisig = MultiSigWallet;
Token = AlphaconCustomToken;
Crowdsale = AlphaconCrowdsale;


// helper functions
toLeftPaddedBuffer = (v) => {val = addHexPrefix(new BigNumber(v).toString(16));buf = toBuffer(val);hex = setLengthLeft(buf, 32).toString("hex");return addHexPrefix(hex);};
logAddress = caption => i => {console.log(caption, i.address);};

address = {};
const { value, error } = validate(require("./input.json"));
input = value;

data = { address, input };

let kyc, vault, locker, multisigs, token, crowdsale;

// mainnet
kyc = KYC.at("0xd6b9e8f3f0d06ce286ae07801e44eacbe86155ef");
vault = Vault.at("0x8a07174804fa1ffedba4a67b0f9be0ce3844dcae");
token = Token.at("0x454b9f249bc1492ee995793bbc3e57b830f1a5e9");
multisigs = ["0x31e0bad1c91a49ca863e7fc63b53dc03441bbf2f", "0xacfd6316b9d9a91d38ce5a7b0b1114e0764410b6", "0x6a8af691a0842d2870722fb8bddd99d491a9ee45", "0x34113da989f72076c7e24a8c9f6c854a60901003", "0x6690005766cab3c3eab6d5841b2d63fc73e570ba", "0x72e0d12630904d5952d673b7ae286e260d9fae11"].map(Multisig.at);
locker = Locker.at("0x0b97e04b413da101b340dd9ed07e0b063e72bc75");
crowdsale = Crowdsale.at("0xb9eb59dd4bc2aab1ce475a9261988077973e7ecd");

/*
KYC.deployed().then(i => kyc = i);
Vault.deployed().then(i => vault = i);
Token.deployed().then(i => token = i);
Locker.deployed().then(i => locker = i);
Crowdsale.deployed().then(i => crowdsale = i);
*/

address.kyc = kyc.address;
address.vault = vault.address;
address.token = token.address;
address.locker = locker.address;
address.crowdsale = crowdsale.address;
address.multisigs = multisigs.map(m => m.address);

Promise.all(multisigs.map(m => m.getOwners()))

token.name();
token.symbol();

crowdsale.startTime().then(parseUnixTimestamp);
crowdsale.endTime().then(parseUnixTimestamp);
crowdsale.rate();
crowdsale.coeff();
crowdsale.goal().then(v => v.toPrecision(18));
crowdsale.cap().then(v => v.toPrecision(18));
crowdsale.nextTokenOwner();
crowdsale.crowdsaleRatio();


crowdsale.bonusesForTimesCount().then(v => numTimeBonuses = v);
crowdsale.bonusesForAmountsCount().then(v => numAmountBonuses = v);

Promise.all(range(numTimeBonuses).map((i) => crowdsale.BONUS_TIMES(i))).then(arr => arr.map(parseUnixTimestamp));
Promise.all(range(numTimeBonuses).map((i) => crowdsale.BONUS_TIMES_VALUES(i)));

Promise.all(range(numAmountBonuses).map((i) => crowdsale.BONUS_AMOUNTS(i)));
Promise.all(range(numAmountBonuses).map((i) => crowdsale.BONUS_AMOUNTS_VALUES(i)));


crowdsale.getHolderCount().then(v => numTokenHolders = v);
Promise.all(range(numTokenHolders).map((i) => crowdsale.holders(i).then(arr => [arr[0], arr[1].valueOf()])));

vault.getHolderCount().then(v => numEtherHolders = v);
Promise.all(range(numEtherHolders).map((i) => vault.holders(i).then(arr => [arr[0], arr[1].valueOf()])));

locker.coeff();

beneficiary0 = get(data, "input.locker.beneficiaries.0.address");
locker.beneficiaries(beneficiary0);
locker.locked(beneficiary0);
locker.getReleaseType(beneficiary0);
locker.getReleaseTimes(beneficiary0).then(arr => arr.map(parseUnixTimestamp));
locker.getReleaseRatios(beneficiary0).then(JSON.stringify);
