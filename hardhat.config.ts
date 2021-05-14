
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-deploy';
/*
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-truffle5';
import 'hardhat-typechain';
import 'hardhat-contract-sizer';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
*/

export default {
  default: 'hardhat',
  networks: {
    localhost: {
      live: false,
      saveDeployments: true,
      tags: ["local"]
    },
    hardhat: {
      live: false,
      saveDeployments: true,
      tags: ["test", "local"]
    }
  },
  solidity: {
    version: '0.8.0',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  namedAccounts: {
    deployer: {
      "localhost": 0
    }
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './build/cache',
    artifacts: './build/artifacts',
    deploy: './deploy',
    deployments: './deployments',
    imports: './imports'
  },
  gasReporter: {
    currency: 'USD',
    enabled: true
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: '<api-key>'
  }

  // external: {
  //   contracts: [
  //     {
  //       artifacts: "node_modules/@uniswap/v2-core/build"
  //     },
  //     {
  //       artifacts: "node_modules/@uniswap/v2-periphery/build"
  //     }
  //   ],
  //   deployments: {
  //     localhost: ["node_modules/@uniswap/v2-core/build", "node_modules/@uniswap/v2-periphery/build"]
  //   },
  // }
};
