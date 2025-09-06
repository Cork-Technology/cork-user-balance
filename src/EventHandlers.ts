/*
 * Custom event dispatcher for the new Envio indexer project.
 *
 * This file serves as the single entry point for attaching all of the
 * custom event handlers defined in the handlers directory. By
 * delegating to dedicated handler modules, the project can cleanly
 * separate concerns and mirror the modular structure of the prior
 * indexer implementation.
 */
import {
  CorkConfig,
  CorkPool,
  ExchangeRateProvider,
  SharesFactory,
  CPT,
  CST,
  PriceFeedAggregator,
} from "generated";

import { attachEventHandlers as attachCorkConfigHandlers } from "./handler/CorkConfig";
import { attachEventHandlers as attachSharesFactoryHandlers } from "./handler/SharesFactory";
import { attachEventHandlers as attachCorkPoolHandlers } from "./handler/CorkPool";
import { attachEventHandlers as attachExchangeRateProviderHandlers } from "./handler/ExchangeRateProvider";
import { attachEventHandlers as attachCorkPTHandlers } from "./handler/CorkPT";
import { attachEventHandlers as attachCorkSTHandlers } from "./handler/CorkST";
import { attachUSDPriceFeedHandlers } from "./handler/ChainlinkAggregator";

// Attach all custom handlers to their respective contracts.
// Each handler module encapsulates the logic required to react to
// contract events and update the indexer's state accordingly.
attachCorkConfigHandlers(CorkConfig);
attachCorkPoolHandlers(CorkPool);
attachExchangeRateProviderHandlers(ExchangeRateProvider);
attachSharesFactoryHandlers(SharesFactory);
attachCorkPTHandlers(CPT);
attachCorkSTHandlers(CST);
attachUSDPriceFeedHandlers(PriceFeedAggregator);
