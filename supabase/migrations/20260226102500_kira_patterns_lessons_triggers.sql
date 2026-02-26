-- STORY-12.3 fix: add updated_at auto-triggers for kira_patterns and kira_lessons
-- Connects to the existing handle_updated_at() function from user_roles migration

DROP TRIGGER IF EXISTS kira_patterns_updated_at ON kira_patterns;
CREATE TRIGGER kira_patterns_updated_at
  BEFORE UPDATE ON kira_patterns
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS kira_lessons_updated_at ON kira_lessons;
CREATE TRIGGER kira_lessons_updated_at
  BEFORE UPDATE ON kira_lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
