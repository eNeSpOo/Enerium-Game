# Artwork provenance

`assets/reference/daily-rewards-reference.png` is the user's visual reference, copied unmodified. `sources/reference-uikit.zip` is their example skill, preserved as a source artifact; it was inspected but not executed or installed. The kit's `enerium-uikit` skill is a separate task-specific implementation.

Source project assets are listed in `assets/source-assets.json` and copied unmodified. They remain user-provided game artwork, without a new assertion of redistribution rights. Fonts carry their original SIL Open Font License files in `assets/fonts`.

Generated assets:

| File | Source | Treatment / status |
|---|---|---|
| `assets/art/panel-ornate-v1.png` | Image generation with the user's daily-rewards reference and a preceding frame draft | Intentionally opaque dark panel, used as a nine-slice surface; no transparency claim. The discarded first generation had a painted checkerboard and is not in production. |
| `assets/art/reward-crystals-v1.png` | Image generation with the user's fourth reward card as reference | Separate opaque item illustration, composited in the reward well. Draft, not accepted by user. |
| `assets/art/reward-gold-v1.png` | First reward card | Individual painted upright coin stacks; opaque background. |
| `assets/art/reward-spirit-v1.png` | Second reward card | Individual painted broad turquoise vortex; opaque background. |
| `assets/art/reward-souls-v1.png` | Third reward card | Individual painted blue soul/fluid flame; opaque background. |
| `assets/art/footer-cartouche-v1.png` | Lower central ornament | Individual narrow bronze footer artwork; opaque background, CSS positioning. |

Prompts are stored in `assets/generation-prompts.json` and `assets/generation-prompts-extra.json`. Live labels, prices, progress, status indicators and buttons are rendered by the library, not baked into art. The current currency UI is a new arrangement, separate from the old reference strip. Generated item illustrations deliberately have dark opaque backgrounds; CSS edge masks soften their compositing boundaries without claiming that the PNGs have transparency. The source lock has actual RGBA: alpha0 was verified at the corner and inside the shackle.

USER clarification: no approved images or appearance descriptions exist for Ethers, Sagans, Distorted or Forgotten. Proposed symbols remain provisional; do not infer canonical anatomy or lore.

reward-chest-v1.png: separate built-in image_gen output, opaque near-black green. Full prompt in assets/generation-prompt-chest.json. No generated text. Used as the lootbox item illustration; not user accepted.
equipment-gloves-v1.png: user-provided ImgSkill.png copied unmodified for demonstration equipment; alpha verified from source. Statistics/association remain fixtures.

## Travel draft v1
Copied unmodified project assets: biome-cavern-v1.png from Assets/Resources/EneriumLocal/Environment/biome-1/far-v3.png; enemy-beast-v1.png from Assets/Resources/Art/Арт — враг b01-elite-epsilon.png. Enemy image is225px: kept at or below native size. Association with illustrative names/stats is not approved. status-shield-v1.png and status-bleeding-v3.png from BattleV24; these are the two previously user-accepted symbols. No Unity assets edited. hero-frame-v13.png inspected but not reused: it contains a visible checkerboard and would require a separate asset correction.

## Black stone and dark iron shell — 2026-09-16

The user supplied `assets/reference/panel-stone-user-reference.png` as the authoritative surface reference, superseding the earlier green panel. `assets/art/panel-stone-v2.png` is the current opaque texture, generated with the built-in image_gen tool. The first candidate (`panel-stone-v1.png`) was rejected internally for excessive grain and brightness; it remains as provenance but is not used. Exact prompts and references are in `assets/generation-prompts-surfaces.json`. No CSS desaturation, contrast filter or raster post-processing is used to obtain the final material.

`assets/art/frame-forged-iron-v1.svg` is a code-authored nine-slice frame with a transparent centre, dark iron bevels and small corner fittings. The bitmap material remains separate and keeps its native proportions. `panel-ornate-v1.png` and `footer-cartouche-v1.png` are now historical assets used by archived versions only. Hero/reward illustrations, rarity frames, approved shield/bleeding icons and gold typography are preserved. These new materials remain drafts until user acceptance.
