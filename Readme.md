Send email to each client after rebalacing

Transfer logic to Crypto bulot (check depot, check withdraw, percentage)
--> Do we sell all before making transfer and then rebuy everything for rebalancing ?
--> Transaction fees = 0.75\*60 = 4.5

--> Sell only one and perform transfer ? buy what if there is nothing to sell

Add endpoint to add to clients dev (with read-only API) and to trading (with transfer and trading APIs)
--> mainly for admin purpose on onboarding

Interface Admin to add client (both dev and trading) DB

Own rebalancing calculation

Manual endpoint for first rebalancing

Change mail destination

If USDT dust > 10$, divide between ETH and BTC

Email not sent on rebalancing and on orders suspicious
