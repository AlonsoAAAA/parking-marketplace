-- Corrección de una sola vez para eventos que ya terminaron pero se quedaron
-- como "active"/"sold_out" porque nunca existió el cron que los cierra
-- (ver EventsService.finishEndedEvents).
UPDATE events
SET status = 'finished'
WHERE status IN ('active', 'sold_out') AND ends_at < NOW();
