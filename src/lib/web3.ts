import { InjectedConnector } from '@web3-react/injected-connector'

export const injected = new InjectedConnector({
  supportedChainIds: [1, 3, 4, 5, 42, 137, 80001] // Mainnet, Ropsten, Rinkeby, Goerli, Kovan, Polygon, Mumbai
}) 