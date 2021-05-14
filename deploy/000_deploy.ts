const chalk = require('chalk');
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {ethers, network} from 'hardhat';
import {Contract} from 'ethers';

import Pair from '@uniswap/v2-core/build/UniswapV2Pair.json';
import UniswapV2Factory from '@uniswap/v2-core/build/UniswapV2Factory.json';
import UniswapV2Router from '@uniswap/v2-periphery/build/UniswapV2Router02.json';

import { wait } from '../scripts/common/utils';
import * as uniswap from '../scripts/common/uniswapHelpers';

const POOL_TOKEN_AMT = ethers.utils.parseEther('1000000');
const LIQUIDITY_TOKEN_AMT = ethers.utils.parseEther('10000');
const LIQUIDITY_ETH_AMT = ethers.utils.parseEther('1000');
const TEST_MONEY = LIQUIDITY_TOKEN_AMT.add(ethers.utils.parseEther('10'));

async function deployERC20(
	deploymentName: string,
	tokenName: string,
	tokenSymbol: string,
	hre: any
): Promise<Contract> {
	let tx, deployResult;

    const {deployments, ethers, getNamedAccounts} = hre;
    const {deploy} = deployments;
    const {provider} = ethers;

	const namedAccounts = await getNamedAccounts();
	const deployer = await ethers.getSigner(namedAccounts['deployer']);

    console.log(chalk.yellow(`Deploying asset ${deploymentName} (name: ${tokenName}, symbol: ${tokenSymbol})`));

	const BasicERC20 = await deployments.getArtifact("BasicERC20");
	deployResult = await deploy(deploymentName, {
		from: deployer.address,
        contract: {
        	abi: BasicERC20.abi,
        	bytecode: BasicERC20.bytecode
        },
		args: [tokenName, tokenSymbol],
		log: true,
	});

	return await ethers.getContractAt("BasicERC20", deployResult.address);
}


const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
	let tx, deployResult;

	console.log(chalk.cyanBright.underline.bold("DEPLOY-ENV"));
	console.log(chalk.cyanBright.bold(`Network: ${network.name}`));

	const {deployments, getNamedAccounts} = hre;
	const {deploy} = deployments;

	// Get signers from configured named accounts
	const namedAccounts = await getNamedAccounts();
	const deployer = await ethers.getSigner(namedAccounts['deployer']);
	console.log(namedAccounts);

	// Deploy Ether Wrapper
	console.log(chalk.yellow(`Deploying WETH token`));
	deployResult = await deploy('WETH9', {
		from: deployer.address,
		args: [],
		log: true,
	});
	const weth = await ethers.getContractAt('WETH9', deployResult.address);

	// Deploy Uniswap
	console.log(chalk.yellow("Deploying Uniswap DEX -> factory"));
	deployResult = await deploy('UniswapFactory', {
		from: deployer.address,
		contract: {
			abi: UniswapV2Factory.abi,
			bytecode: UniswapV2Factory.bytecode
		},
		args: [deployer.address],
		log: true,
	});
	const factory = await ethers.getContractAt(UniswapV2Factory.abi, deployResult.address);

	console.log(chalk.yellow("Deploying Uniswap DEX -> router"));
	deployResult = await deploy('UniswapRouter', {
		from: deployer.address,
		contract: {
			abi: UniswapV2Router.abi,
			bytecode: UniswapV2Router.bytecode
		},
		args: [factory.address, weth.address],
		log: true,
	});
	const router = await ethers.getContractAt(UniswapV2Router.abi, deployResult.address);

	// Deploy ERC20 token
	console.log(chalk.yellow(`Deploying cash ERC20 token`));
	const cash = await deployERC20("Cash", "Roger", "ROG", hre);

	tx = await cash.connect(deployer).mint(deployer.address, TEST_MONEY);
	await wait(tx.hash, `cash.mint`);

	// Create pair and add liquidity
	const cash_weth = await uniswap.createPair(cash, weth, factory);
	await uniswap.addLiquidityETH(router, cash, LIQUIDITY_TOKEN_AMT, LIQUIDITY_ETH_AMT, deployer);

	// Deploy incentive pool
	console.log(chalk.yellow(`Deploying incentive pool`));
    const latestBlock = await ethers.provider.getBlock("latest");
	const startBlock = ethers.BigNumber.from(latestBlock.number).add(4);
	deployResult = await deploy('RewardPool', {
		from: deployer.address,
		args: [
			cash.address,
			startBlock,
			24 * 3600 / 3,
			POOL_TOKEN_AMT
		],
		log: true,
	});
	const pool = await ethers.getContractAt('RewardPool', deployResult.address);

	tx = await cash.connect(deployer).mint(pool.address, POOL_TOKEN_AMT);
	await wait(tx.hash, `cash.mint`);

	tx = await pool.connect(deployer).add(
		1,
		cash_weth.address,
		true,
		0
	);
	await wait(tx.hash, `pool.add`);
};

export default func;
func.tags = ['Env'];
