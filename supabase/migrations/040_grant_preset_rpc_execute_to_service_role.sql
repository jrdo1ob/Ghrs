GRANT EXECUTE ON FUNCTION public.add_preset_reward(uuid, uuid, integer, numeric)
TO service_role;

GRANT EXECUTE ON FUNCTION public.create_story(uuid, text, text, text, integer, uuid)
TO service_role;

GRANT EXECUTE ON FUNCTION public.add_preset_story(uuid, uuid, uuid)
TO service_role;