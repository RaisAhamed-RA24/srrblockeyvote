const fs = require("fs");
const path = require("path");
const { Web3 } = require("web3");

const web3 = new Web3("http://127.0.0.1:7545");

const artifactPath = path.join(
    __dirname,
    "../../artifacts/contracts/Voting.sol/Voting.json"
);

const artifact = JSON.parse(
    fs.readFileSync(artifactPath, "utf8")
);

const contractAddress =
    "0xB01aDdFEBbc721C1806a37E919345a1BEcB88316";

const contract = new web3.eth.Contract(
    artifact.abi,
    contractAddress
);

const account = web3.eth.accounts.privateKeyToAccount(
    process.env.GANACHE_PRIVATE_KEY
);

web3.eth.accounts.wallet.add(account);

module.exports = {
    web3,
    contract,
    account
};