-- Indexes for performance
create index if not exists idx_holdings_user_symbol on public.holdings (user_id, symbol);
create index if not exists idx_portfolio_snapshots_user_date on public.portfolio_snapshots (user_id, date);
