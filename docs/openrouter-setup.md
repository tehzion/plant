# OpenRouter local setup

The application can use OpenRouter's OpenAI-compatible endpoint for the existing assessment and assistant workflow. The primary model remains `gpt-5.4-mini` (`openai/gpt-5.4-mini` on OpenRouter), with the existing `gpt-5-mini` fallback. PlantNet remains a separate integration. The provider can route the same model through different hosts, so output and availability can differ from direct OpenAI.

1. Create a key in the [OpenRouter dashboard](https://openrouter.ai/settings/keys).
2. Open the workspace's ignored `.env.local` in a local editor and set `OPENROUTER_API_KEY` to that key. Do not paste the key into chat, commit it, or use a `VITE_` variable.
3. Ensure `AI_PROVIDER=openrouter` is set in the same file. The assistant has already selected it for this local workspace.
4. Restart the backend so it loads the configuration. Existing model overrides remain respected; an unqualified OpenAI model name is given the `openai/` prefix for OpenRouter.

No live paid request is needed to configure the application. The existing direct OpenAI key can remain in the local file; it is not sent to OpenRouter and is not used when `AI_PROVIDER=openrouter`. To switch back deliberately, set `AI_PROVIDER=openai`. Hosted deployments need their own server-side environment settings and restart/deployment; this change does not alter or deploy them.

Do not run the evaluation pilot without its separate paid-call approval, dataset rights review, and isolated database/audit configuration. API responses and the account's actual balance, access and cost have not been tested.
