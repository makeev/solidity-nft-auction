# Simple NFT Auction 

Uses Hardhat as development enviroment for compilation, testing and deployment tasks

## Set your data to .env file
```
ETHERSCAN_API_KEY=
INFURA_API_KEY=
INFURA_PK=
```
### or set your netwroks in hardhat.config.js

## Run tests:

- run local node first
    ```shell
    npx hardhat node
    ```

- now run tests 
    ```shell
    npx hardhat test --network localhost
    ```


## Deploy 

Provide your network data in hardhat.config.js and
```
npx hardhat run --network <you netwrok from config> scripts/deploy.js
```

Sample contract deployed to Goerli network 
https://goerli.etherscan.io/address/0xCfB3417b56d05e287ddE8c66E2e65054CE9FB7fF


## NFT contract for testing

deploy it
```
npx hardhat run --network <you netwrok from config> scripts/deploy_test_nft.js
```

OR use deployed contract in Goerli network https://goerli.etherscan.io/address/0x272b14a6beE72e2fd484e2cf6b70220dB31cec2F

just call `awardItem('my reward')` contract method.