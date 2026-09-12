-- Sub-lots: a batch can be split at racking into child batches (one level deep).
-- Parent becomes an aggregate record in stage 'Split'; children carry parent_batch_id.
alter table batches add column if not exists parent_batch_id uuid references batches(id) on delete restrict;
alter table batches add column if not exists lot_label text;
alter table batches add column if not exists split_at timestamptz;
create index if not exists batches_parent_idx on batches(parent_batch_id);

-- A transfer can move volume into another batch (the child created by a split).
alter table batch_transfers add column if not exists to_batch_id uuid references batches(id) on delete set null;
