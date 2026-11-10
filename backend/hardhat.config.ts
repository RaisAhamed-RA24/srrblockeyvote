import "dotenv/config";
import { defineConfig } from "hardhat/config";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";

export default defineConfig({
    plugins: [hardhatToolboxViemPlugin],

    solidity: {
        version: "0.8.20",
        settings: {
            evmVersion: "paris"
        }
    },

    networks: {
        ganache: {
            type: "http",
            url: "http://127.0.0.1:7545",
            accounts: [process.env.GANACHE_PRIVATE_KEY!]
        }
    }
});