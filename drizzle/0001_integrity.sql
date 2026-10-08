-- Audit log is append-only: UPDATE and DELETE are rejected at the database level (spec 51, 93).
CREATE OR REPLACE FUNCTION audit_logs_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION results_locked_guard() RETURNS trigger AS $$
BEGIN
  IF OLD.status IN ('PUBLISHED','LOCKED') AND (NEW.total IS DISTINCT FROM OLD.total OR NEW.grade IS DISTINCT FROM OLD.grade OR NEW.grade_point IS DISTINCT FROM OLD.grade_point)
     AND current_setting('fcgbs.amendment', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'published results can only change through an approved amendment';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER results_locked BEFORE UPDATE ON results FOR EACH ROW EXECUTE FUNCTION results_locked_guard();
--> statement-breakpoint
ALTER TABLE results ADD CONSTRAINT results_total_range CHECK (total IS NULL OR (total >= 0 AND total <= 100));
