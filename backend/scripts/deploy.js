import "dotenv/config";
import fs from "fs";
import { Web3 } from "web3";

const web3 = new Web3("http://127.0.0.1:7545");

async function main() {
    const privateKey = process.env.GANACHE_PRIVATE_KEY;

    if (!privateKey) {
        throw new Error("GANACHE_PRIVATE_KEY is missing from .env");
    }

    const account = web3.eth.accounts.privateKeyToAccount(privateKey);

    web3.eth.accounts.wallet.add(account);

    console.log("Deploying from:", account.address);

    const artifactPath =
        "./artifacts/contracts/Voting.sol/Voting.json";

    const artifact = JSON.parse(
        fs.readFileSync(artifactPath, "utf8")
    );

    const contract = new web3.eth.Contract(artifact.abi);

    const deployedContract = await contract.deploy({
        data: artifact.bytecode
    }).send({
        from: account.address,
        gas: 3000000
    });

    console.log(
        "Voting contract deployed to:",
        deployedContract.options.address
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});