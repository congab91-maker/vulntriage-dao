# VulnTriage DAO Web

GenLayer-first adjudication console for the VulnTriage DAO MVP.

## Current mode

- Target: GenLayer Studionet, chain ID `61999`.
- Wallet switching: `genlayer-js` `client.connect("studionet")`.
- Contract deployed on Studionet:
  `0x140Bc1D1ee108271B5ec46c6363Ba0DAa69C49a8`.
- Data: clearly marked UI fixtures only.
- Live reads and writes: intentionally disabled until the frontend integration
  is completed and verified against the deployed contract API.

## Windows development

```powershell
npm run dev
npm run build
npm run lint
npx next build
```

Do not add a placeholder address or local `.env` file.
