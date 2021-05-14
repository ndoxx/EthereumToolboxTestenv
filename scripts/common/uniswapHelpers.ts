import { ethers, network } from 'hardhat';
import { Contract, ContractFactory, BigNumber, FixedNumber, utils } from 'ethers';
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { wait } from './utils';

import Pair from '@uniswap/v2-core/build/UniswapV2Pair.json';
import UniswapV2Factory from '@uniswap/v2-core/build/UniswapV2Factory.json';
import UniswapV2Router from '@uniswap/v2-periphery/build/UniswapV2Router02.json';

const chalk = require('chalk');

export async function deployWeth(
	operator: SignerWithAddress
) {
	console.log(chalk.yellow(`Deploying fake WETH token`));
	const Token = await ethers.getContractFactory("WETH9");
	const tokenContract = await Token.connect(operator).deploy();
	await wait(tokenContract.deployTransaction.hash, `deploy.weth: ${tokenContract.address}`);

	return tokenContract;
}

export async function deployUniswap(
	weth: Contract,
	operator: SignerWithAddress
) {
	console.log(chalk.yellow("Deploying fake Uniswap DEX -> factory"));
	const Factory = await ethers.getContractFactory(UniswapV2Factory.abi, UniswapV2Factory.bytecode);
	const factory = await Factory.connect(operator).deploy(operator.address);
	await wait(factory.deployTransaction.hash, `deploy.factory: ${factory.address}`);

	console.log(chalk.yellow("Deploying fake Uniswap DEX -> router"));
	const Router = await ethers.getContractFactory(UniswapV2Router.abi, UniswapV2Router.bytecode);
	const router = await Router.connect(operator).deploy(factory.address, weth.address);
	await wait(router.deployTransaction.hash, `deploy.router: ${router.address}`);

	return {factory, router};
}

export async function createPair(
	tokenA: Contract,
	tokenB: Contract,
	factory: Contract
): Promise<Contract> {
	let tx;
	const symbolA = await tokenA.symbol();
	const symbolB = await tokenB.symbol();
	const pairName = `${symbolA}-${symbolB}`;

	console.log(chalk.yellow(`Creating ${pairName} pair`));

	let pairAddress: string = "";
	const triggerPromise = new Promise<void>((resolve, reject) => {
		factory.on("PairCreated", (token0, token1, pair, length) => {
			pairAddress = pair;
			resolve();
		});

		setTimeout(() => {
			reject(new Error('timeout'));
		}, 20000); // 20s timeout
	});

	tx = await factory.createPair(tokenA.address, tokenB.address);
	await wait(tx.hash, `factory.createPair`);
	await triggerPromise;

	// At this point, the pair has been created
	console.log(chalk.green(`${pairName} Pair address: ${pairAddress}`));
	return await ethers.getContractAt(Pair.abi, pairAddress);
}

export async function addLiquidity(
	router: Contract,
	tokenA: Contract,
	AmountA: BigNumber,
	tokenB: Contract,
	AmountB: BigNumber,
	operator: SignerWithAddress
): Promise<void> {
	let tx;
	const symbolA = await tokenA.symbol();
	const symbolB = await tokenB.symbol();
	const pairName = `${symbolA}-${symbolB}`;

	console.log(chalk.yellow(`Adding liquidity to ${pairName} pool`));
	tx = await tokenA.connect(operator).approve(router.address, AmountA); 
	await wait(tx.hash, `${symbolA}.approve`);

	tx = await tokenB.connect(operator).approve(router.address, AmountB);
	await wait(tx.hash, `${symbolB}.approve`);

	tx = await router.connect(operator).addLiquidity(
		tokenA.address,
		tokenB.address,
		AmountA, // desired tokenA amt
		AmountB, // desired tokenB amt
		AmountA, // min tokenA amt (same as desired bc we are the price fixers)
		AmountB, // min tokenB amt
		operator.address,
		Math.floor(Date.now() / 1000) + 60 * 10 // deadline
	);
	await wait(tx.hash, `router.addLiquidity`);
}

export async function addLiquidityETH(
	router: Contract,
	token: Contract,
	amount: BigNumber,
	minETH: BigNumber,
	operator: SignerWithAddress
): Promise<void> {
	let tx;
	const symbol = await token.symbol();
	const pairName = `${symbol}-WETH`;

	console.log(chalk.yellow(`Adding liquidity to ${pairName} pool`));

	tx = await token.connect(operator).approve(router.address, amount); 
	await wait(tx.hash, `${symbol}.approve`);

	tx = await router.connect(operator).addLiquidityETH(
		token.address,
		amount, // desired tokens
		amount, // min tokens (same as desired bc we are the price fixers)
		minETH,
		operator.address,
		Math.floor(Date.now() / 1000) + 60 * 10, // deadline
		{value: minETH}
	);
	await wait(tx.hash, `router.addLiquidityETH`);
}

export async function calculatePrice(
	pair: Contract,
	weth: Contract
): Promise<number> {
	const reserves = await pair.getReserves();
	const token0 = await pair.token0();
	if(token0 == weth.address) {
		return FixedNumber.from(reserves[0]).divUnsafe(FixedNumber.from(reserves[1])).toUnsafeFloat();
	}
	return FixedNumber.from(reserves[1]).divUnsafe(FixedNumber.from(reserves[0])).toUnsafeFloat();
}