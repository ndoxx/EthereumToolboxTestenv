import { ParamType } from 'ethers/lib/utils';
import { Contract, BigNumber } from 'ethers';
import { ethers } from 'hardhat';

import * as fs from 'fs';
import * as path from 'path';
const chalk = require('chalk');

export function encodeParameters(
    ethers: any,
    types: Array<string | ParamType>,
    values: Array<any>
) {
    const abi = new ethers.utils.AbiCoder();
    return abi.encode(types, values);
}

// Waits for a transaction and displays current action
export async function wait(
    hash: string,
    desc?: string,
    confirmation: number = 1
): Promise<void> {
    if (desc) {
        console.log(`> Waiting tx ${hash}\n    action = ${desc}`);
    } else {
        console.log(`> Waiting tx ${hash}`);
    }
    await ethers.provider.waitForTransaction(hash, confirmation);
}

export async function evmSnapshot(): Promise<string> {
    return await ethers.provider.send("evm_snapshot", []);
}

export async function evmRevert(
    id: string
): Promise<void> {
    await ethers.provider.send("evm_revert", [id]);
}

export async function deployedContract(
    name: string, 
    deployments: any
): Promise<Contract> {
    const deployResult = await deployments.get(name);
    return await ethers.getContractAt(deployResult.abi, deployResult.address);
}

export async function latestBlocktime(provider: any): Promise<BigNumber> {
    const latest = await provider.getBlock("latest");
    return BigNumber.from(latest.timestamp);
}

export function asEthers(value: number) {
    return ethers.utils.parseEther(value.toString());
}

export function savePersistent(
    persistent: any,
    network: any
) {
    const data = JSON.stringify(persistent);
    const pPath = path.join(__dirname, "../../deployments", network.name, ".persistent.json");
    fs.writeFileSync(pPath, data);
    console.log(`Saved persistent data to: ${pPath}`);
}

export function loadPersistent(
    network: any
) {
    const pPath = path.join(__dirname, "../../deployments", network.name, ".persistent.json");
    const rawdata = fs.readFileSync(pPath);
    console.log(`Loaded persistent data from: ${pPath}`);
    return JSON.parse(rawdata.toString());
}
