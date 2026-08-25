---
name: theagentcy
description: Complete reference for designing through The Agentcy MCP server — the user's social design workspace (pieces, slides, layers, brand tokens, carousels, captions, calendar, stock images, video clips). Use whenever working with The Agentcy, its `mcp__theagentcy__*` tools, or any request about designing, editing, scheduling, previewing or translating a piece/post/carousel/story/cover, writing hooks or captions, the brand kit, templates, or cutting clips from a recording. Also triggers on "The Agentcy", "theagentcy", "pieza", "carrusel", "posteo", "portada", "hook", "brand kit".
---

# The Agentcy: designing through the MCP server

You are connected to a person's design workspace. Through it you can read their
brand, build social pieces, edit any layer of any piece, and put them on their
calendar. Everything you do lands in the app they have open: there is no draft
space that belongs only to you, and no step where a human approves your writes
before they take effect.

This document is the complete reference: read it once and stop guessing.

---

## 1. What a piece is

A **piece** is one post. It has a row (title, status, category, plannedDate,
version) and a **PieceDoc**, which is the design itself.

```
PieceDoc
├── schemaVersion: 1
├── title: string
├── category?: string
├── format: { preset: "4:5" | "1:1" | "9:16" | "16:9", width, height }
├── slides: [ Slide, ... ]          ordered, 1 to 20
├── captions: { instagram?, x?, linkedin?, tiktok? }
└── meta: { templateId, notes?, language?, translationOf? }

Slide
├── id: string                      the handle for slide level ops
├── background: color | gradient | image
└── layers: [ Layer, ... ]          ORDER IS THE Z ORDER, last on top

Layer  (type: text | image | shape | logo | artifact)
├── id: string                      the handle for layer level ops
├── frame: { x, y, w, h }           pixels on the canvas, origin top left
├── role?: string                   headline, kicker, body, cta, stat, photo...
└── ... fields specific to the type
```

**The doc is portable.** It holds no workspace id, no piece id and no URLs, and
its colors and fonts are tokens. That is what lets a piece saved as a template
render correctly no matter how the brand kit changes later.

**Ids are the only handles.** There is no "the headline on slide 2" selector.
Every op names a `layerId` or a `slideId`, and those ids come from `get_piece`
or from the `outline` that `create_piece` and `update_piece` return.

### Pieces in another language

`meta.language` is `es`, `en` or `pt` when the piece declares one, and
`meta.translationOf` holds the id of the piece this one was duplicated from. A
piece whose `meta.language` does not match the text you read in it is one
waiting to be translated: see `duplicate_piece` in section 6.

### Format presets

| preset | pixels | use |
| --- | --- | --- |
| `4:5` | 1080 x 1350 | the default. Instagram feed, carousels |
| `1:1` | 1080 x 1080 | square feed posts, X images |
| `9:16` | 1080 x 1920 | stories, reels covers, TikTok |
| `16:9` | 1920 x 1080 | YouTube covers, wide images for X and LinkedIn, slides |

The format belongs to the PIECE, not to a slide: every slide of a carousel is
the same canvas. `create_piece({ format })` picks it, and `set_format` moves an
existing piece to another one, reframing every layer as it goes (see the op).

Coordinates may fall outside the canvas. That is not a mistake: a photo or a
shape that runs off the edge (a bleed) is a normal design move. The renderer
clips it.

Each format has a **safe area**: the strip where the platform draws its own
interface over your image. The feed eats the bottom ~250px of a 4:5, a story has
chrome top and bottom, a wide cover has a player bar along the bottom, and the
square has none. Nothing enforces it, but a headline you put there is a headline
the reader never sees.

---

## 2. Brand tokens, and who decides

Colors and fonts are written as **references to the workspace brand kit**.

```
$brand.primary   $brand.secondary   $brand.accent
$brand.bg        $brand.bgAlt
$brand.ink       $brand.inkInverse

$brand.display   $brand.body        $brand.mono
```

**The rule, and it is mechanical: a value YOU chose goes in as a token.** A
literal hex you picked yourself freezes the piece to a value the user can change
in one click in Tu cuenta, so it stops matching its own brand and nobody can see
why. That is the whole rule of this section. The rest is defaults.

Call `get_brand_kit` for the resolved values, so you can reason about contrast
and pairing. Then write the tokens.

`get_brand_kit` also returns `voice`: free text where the user described how
their brand speaks. Follow it literally. It outranks your defaults about tone,
length and punctuation. If it is empty, ask them for it instead of inventing one.

### Defaults, for when the user did not say

How a piece looks when nobody asked for anything in particular. Defaults, not
laws.

- `$brand.bg` is the page. `$brand.ink` is text on that page.
- `$brand.inkInverse` is text over a photo, over a dark panel, over
  `$brand.primary`. Using `$brand.ink` there produces a piece nobody can read.
- `$brand.bgAlt` separates a block from the page without drawing a border.
- `$brand.primary` and `$brand.accent` are emphasis. One accent per slide.
- `$brand.display` is for headlines, `$brand.body` for running text,
  `$brand.mono` for small uppercase labels (eyebrows, numbers, tags).

### The user's instruction outranks all of it

When the user asks for something concrete, do it. Follow the instruction
literally, the same way you follow `voice`: it outranks every default above, and
their brand is theirs to break. Do not warn before acting and do not ask
permission for the thing they just described (deleting a piece is the exception,
see section 6). If something is worth saying, say it after, in one line, and
never close by offering to undo what they asked for.

Report three things every time, because they are facts about the result rather
than opinions about it: it will not look like what they asked for (the token
they named resolves to another color), the text came out unreadable on its
background, or the family they named is not in `fontCatalog`. That is not second
guessing them, it is refusing to hand back something broken in silence.

**A color the user names goes in literally.** No tool writes the brand kit, so
when they ask for a color their kit does not have, the hex in that layer is the
answer and not a detour to Tu cuenta. A literal you chose is still a bug. A
literal they asked for is the instruction, not an exception to apologize for.
Once it is applied, one line offering to save that color in the kit from Tu
cuenta so it holds across every piece. Once, and then let it go.

**A font has a real limit.** `fontCatalog` is the list of families this renderer
can draw, plus whatever the user uploaded into their own kit. A family outside
it exports in a fallback face nobody picked, so here there is no literal worth
writing: name the catalog families closest to what they asked for and let them
choose. That is the renderer talking, not taste.

---

## 3. The tools

| tool | what it does |
| --- | --- |
| `get_brand_kit` | colors, fonts, logos, voice, the font catalog |
| `list_templates` | the templates this workspace saved, each with its `roles` brief. New workspaces start with none |
| `list_hooks` / `save_hook` | the hook bank: opening lines grouped by intent. Read it before writing a cover and adapt what you find, never paste it verbatim. `save_hook` puts back the ones that worked |
| `list_pieces` | summaries, newest first, filterable by `status` and `backlog`, paged with `limit` and `cursor` |
| `get_piece` | the row plus the full doc |
| `list_calendar` | what is planned between two dates |
| `check_brand` | the deterministic findings on one piece |
| `create_piece` | from a doc you design, from a saved template, or blank, in any format |
| `update_piece` | a batch of ops against a baseVersion |
| `set_piece_meta` | title, category, plannedDate, status, backlog |
| `duplicate_piece` | a copy of a piece, optionally into another language |
| `save_as_template` | keep a piece's shape for next time |
| `list_assets` | the workspace media library: everything already copied in |
| `list_backgrounds` / `import_background` | the house background textures, no credit attached. For a texture, look here before `search_stock` |
| `import_image_from_url` | copy an image into the library |
| `search_stock` | free to use photos, with their credit |
| `import_stock` | save one of those photos into the library |
| `render_preview` | a single use URL of the real render |
| `delete_piece` | to the trash, or `purge: true` for good |
| `get_reach_config` / `set_reach_config` | the Instagram follow tool's config (Studio plan): niche accounts, own accounts, never-follow, follow cap. The config ships inside the script the user copies, so tell them to re-copy it after changes |
| `list_video_projects` | the long recordings, with transcription status |
| `get_transcript` | one recording's segments, with timestamps |
| `cut_clip` | a vertical clip out of the ranges you chose (Studio plan) |

### The flow that works

1. **`get_brand_kit`.** Once per session, before writing a word.
2. **`list_templates`.** If this workspace saved templates, read the `roles`
   of the candidates. Each role is `{ slideIndex, role, maxChars, sampleText }`:
   the slide it sits on, what it is for, the character budget the layout was
   designed around, and what was there when it was saved. That is your content
   brief; a template whose shape matches what the user wants to say beats
   starting over. A new workspace has none: skip straight to designing.
3. **`create_piece({ doc, title })`** with a doc you design against the brand
   tokens, or **`create_piece({ templateSlug, title })`** to reuse a saved
   shape. Either way you get back `pieceId`, `version: 1` and an `outline`
   listing every slide id and layer id.
4. **`update_piece`.** If you started from a saved template, write the words
   first, in ONE batch of `set_text` ops; with a doc you designed the words are
   already yours. Look at the result, then adjust style and structure in later
   batches. Call `list_hooks` before you settle the cover line: it decides
   whether any of the rest gets read.
5. **`check_brand`.** The mechanical pass: a color outside the kit, a layer left
   empty, text that does not fit or that is the exact color of what is behind
   it. Cheap, and it catches what you cannot see.
6. **`render_preview`.** If you can open a URL, look at it. If you cannot, say
   so and give the URL to the user. Never claim to have seen a piece you did
   not open. `slides: [1, 3]` renders only those slides, 1 based, when you want
   to check one fix instead of pulling the whole carousel.
7. **`set_piece_meta({ plannedDate })`.** Put it on the calendar. When the piece
   is a proposal rather than a commitment, use `set_piece_meta({ backlog: true })`
   instead: a backlog piece is an **idea**, it stays off the calendar and waits
   in the Undated strip of the user's home screen until they give it a date.
   Propose there freely, and leave the promotion to them.

Designing the doc yourself is the normal path: the type scale, the spacing and
the token usage are yours to get right, and section 5 tells you how. A saved
template gets you a shape that already worked in this workspace for free.

---

## 4. Editing: ops and versions

Every edit is `update_piece({ pieceId, baseVersion, ops })`.

**`baseVersion`** is the `version` you read from `get_piece`. The save compares
it against the database inside the same statement, so if the user saved from
the canvas while you were composing, your write is rejected instead of
overwriting them. This is the normal case in this product, not a rare one: the
user in the canvas and their agent over MCP, at the same time.

**The batch is atomic.** Up to 20 ops, applied in order to a copy. If op 7
fails, nothing is saved, including ops 1 to 6. You never have to work out how
far it got.

**One call carries the whole change.** A change that touches five slides is ONE
`update_piece` holding the ops for all five, never one call per slide. Five
round trips is five times the wait for the person watching their canvas, for
exactly the same result.

**Validation is lenient in one direction only.** A bad cosmetic value degrades
to the default and comes back in `warnings` (`fontSize: 9999` becomes 48). A
structural error (unknown layer id, a batch that would leave zero slides)
applies nothing and returns an error with a hint. Always read `warnings`: they
are the diff between what you asked for and what was saved.

### The 14 ops

Where the usual changes live: the color behind a slide is `set_background`, a
layer's color, weight or family is `set_layer_style`, the words are `set_text`.
Each block below is the complete shape of its op, not one variant of it. Copy it
and fill it in. Nothing here needs a probe call to confirm.

**`set_text`** the workhorse. Replaces the content of a text layer.

```json
{ "op": "set_text", "layerId": "ly_a1", "content": "Line one\nLine two",
  "fontSize": 72, "color": "$brand.ink", "align": "center" }
```

`content` is plain text with newlines. Never HTML: it is drawn as text, so
markup will appear literally. `fontSize`, `color` and `align` are optional
conveniences for the fields you most often change alongside the words.

**`set_layer_style`** patches any other field of a layer.

```json
{ "op": "set_layer_style", "layerId": "ly_a1",
  "patch": { "fontWeight": 700, "letterSpacing": -2, "textTransform": "uppercase" } }
```

The patch is validated against the layer's real type: sending `content` to an
image layer is an error, not a silent no-op, because it means you think you
edited something you did not. The patch is partial per field but not inside a
field: sending `frame: { x: 10 }` replaces the whole frame and the rest reverts
to defaults. To nudge a layer, use `move_layer`.

**`move_layer`** merges into the frame, which is what you want 90% of the time.

```json
{ "op": "move_layer", "layerId": "ly_a1", "frame": { "y": 520 }, "rotation": -4 }
```

**`reorder_layer`** changes the z order inside its slide.

```json
{ "op": "reorder_layer", "layerId": "ly_photo", "to": "back" }
```

`to` is `"front"`, `"back"` or a 0 based index. An index out of range is
clamped with a warning rather than refused.

**`add_layer`** adds one to a slide. Max 20 per slide.

```json
{ "op": "add_layer", "slideId": "sl_2", "layer": {
    "type": "text", "role": "kicker",
    "frame": { "x": 90, "y": 180, "w": 900, "h": 80 },
    "content": "CASE STUDY", "fontFamily": "$brand.mono", "fontSize": 28,
    "letterSpacing": 6, "textTransform": "uppercase", "color": "$brand.secondary" } }
```

You can omit `id`: one is generated and appears in the `outline` of the result.
The new layer goes on top of the stack.

**`remove_layer`**

```json
{ "op": "remove_layer", "layerId": "ly_a1" }
```

**`set_background`** replaces a slide's background.

```json
{ "op": "set_background", "slideId": "sl_1",
  "background": { "type": "color", "color": "$brand.bg" } }

{ "op": "set_background", "slideId": "sl_1", "background": {
    "type": "gradient",
    "gradient": { "type": "linear", "angle": 160,
      "stops": [ { "color": "$brand.primary", "at": 0 },
                 { "color": "$brand.ink", "at": 1 } ] } } }

{ "op": "set_background", "slideId": "sl_1", "background": {
    "type": "image", "assetId": "<uuid>", "blur": 0,
    "focalPoint": { "x": 0.5, "y": 0.35 },
    "overlay": { "color": "$brand.ink", "opacity": 0.45 } } }
```

The `overlay` is how a light headline stays readable over any photograph.
Gradients are linear only, 2 to 4 stops, `at` from 0 to 1.

**`set_image`** points an image layer at an asset.

```json
{ "op": "set_image", "layerId": "ly_photo", "assetId": "<uuid>",
  "focalPoint": { "x": 0.5, "y": 0.3 } }
```

`assetId` must be a real uuid from the workspace media library: `list_assets`
shows what is there, and `import_image_from_url`, `import_stock` or
`import_background` put something new in it. `focalPoint` is the point kept in
view when the frame crops: `{ x: 0.5, y: 0.3 }` keeps a face near the top whole.

**`add_slide`** appends, inserts, or duplicates. Max 20 slides.

```json
{ "op": "add_slide" }
{ "op": "add_slide", "after": "sl_2" }
{ "op": "add_slide", "after": "sl_2", "from": "duplicate:sl_2" }
```

Duplicating is the cheapest way to extend a carousel: the layout comes back with
fresh ids and you only rewrite the text.

**`remove_slide`** fails on the last remaining slide (a piece needs at least
one).

```json
{ "op": "remove_slide", "slideId": "sl_3" }
```

**`reorder_slides`** takes an exact permutation: every current id, once each.

```json
{ "op": "reorder_slides", "order": ["sl_1", "sl_3", "sl_2"] }
```

**`set_captions`** writes the copy per network. Merges per network; `null`
clears one.

```json
{ "op": "set_captions", "captions": {
    "instagram": { "text": "...", "firstComment": "Link in bio" },
    "linkedin": { "text": "..." },
    "x": { "thread": ["First tweet", "Second tweet"],
           "imageMap": ["slide:1", "none"] },
    "tiktok": null } }
```

Limits: Instagram and TikTok 2200 characters, LinkedIn 3000, one tweet 280, a
thread 25 tweets. `imageMap` is positional: which slide rides with each tweet,
or `"none"`.

**`set_format`** moves the whole piece to another canvas and reframes it.

```json
{ "op": "set_format", "format": "9:16" }
```

Every layer of every slide is scaled by ONE factor and centred inside the safe
area of the new format, and a text block that ended up outside is pulled back
in. Ids do not change, so the ops you were about to send still address the right
layers. Sending the format the piece already has does nothing.

A reframe moves a design, it does not redesign it. Taking a 4:5 carousel to 16:9
leaves room on the sides, and taking it to 9:16 leaves room above and below:
that space is yours to fill, and filling it is the difference between a piece
made for the format and one converted to it.

**`set_meta`** title, category and private notes.

```json
{ "op": "set_meta", "title": "Why retention beats reach",
  "category": "playbook", "notes": "Angle came from the user's Q3 numbers" }
```

`notes` is never published. It is the right place to record why a piece is the
way it is, for whoever (you, next week) picks it up again.

### Field ranges worth knowing

Values outside these degrade to the default with a warning, they do not fail.

| field | range | default |
| --- | --- | --- |
| `fontSize` | 8 to 400 | 48 |
| `fontWeight` | 400, 500, 600, 700, 800 | 400 |
| `lineHeight` | 0.8 to 2.5 | 1.2 |
| `letterSpacing` | -5 to 40 | 0 |
| `opacity` | 0 to 1 | 1 |
| `rotation` | -360 to 360 | 0 |
| `borderRadius`, `radius` | 0 to 540 | 0 |
| text `content` | 1000 characters, truncated | "" |
| frame `w`, `h` | 1 to 4000 | 1080 x 200 |

Shapes are `rect`, `pill`, `ellipse` or `line`, with a `fill` (a color ref or a
gradient) and an optional `stroke`. Logos take a `variant`
(`primary`, `icon`, `wordmark`) and a `tint` (`"original"` or a color ref, for
placing a logo over a dark photo). A logo has no `assetId`: it resolves against
the brand kit, which is why a doc or a saved template can ship with the logo
already placed.

### Artifact layers: software drawn by code

An `artifact` layer draws a piece of software: an app window, a browser, a
spreadsheet, a chat, a payment receipt. Use it whenever a slide needs to show a
product, a number in context, or a conversation. It is not a screenshot and
needs no asset: it is drawn from fields, so it scales cleanly, follows the brand
accent, and stays editable. Reach for it instead of describing a screen in
prose.

Every artifact takes the same flat bag of fields. Which ones get drawn depends
on `kind`, and a field the kind does not use is simply ignored rather than
rejected.

| field | what it is |
| --- | --- |
| `kind` | `window`, `browser`, `spreadsheet`, `chat`, `receipt`. Anything else degrades to `window` |
| `theme` | `light` or `dark`. This is the artifact's own chrome, independent of the slide background |
| `accent` | a color ref. Colors the strong values, the spreadsheet header, the receipt check |
| `title`, `subtitle`, `footer` | strings, 80 / 120 / 120 characters |
| `rows` | up to 12 `{ label, value, strong }`. `strong` draws the row in the accent |
| `messages` | up to 8 `{ from: "me" \| "them", text }`. `"me"` sits on the right |

Sending **more than 12 rows or more than 8 messages empties that list**, it does
not trim it. Count before you send.

What each kind reads:

- **`window`** an app window with a traffic light chrome. `title` is the window
  name, `rows` the body, `footer` an optional status bar. The default when in
  doubt.
- **`browser`** a browser window. `subtitle` is the URL in the address bar,
  `title` the page headline, `rows` the lines of page content, `footer` a note
  under them.
- **`spreadsheet`** a numbered grid. `title` is the file name, `subtitle` the
  small label on the right of the header, `rows` the cells (label in the wide
  column, value in the right one), `footer` the active tab.
- **`chat`** a conversation. `title` is the header, `messages` the bubbles,
  `footer` the text of the composer field at the bottom.
- **`receipt`** a payment confirmation. `title` is the concept, `subtitle` the
  AMOUNT set large, `rows` the line items, `footer` the date or operation
  number.

```json
{ "op": "add_layer", "slideId": "sl_1", "layer": {
    "type": "artifact", "kind": "receipt", "theme": "light",
    "frame": { "x": 190, "y": 380, "w": 700, "h": 560 },
    "accent": "$brand.primary",
    "title": "Pago recibido", "subtitle": "USD 1.240",
    "rows": [
      { "label": "Plan", "value": "Anual", "strong": false },
      { "label": "Clientes", "value": "24", "strong": false },
      { "label": "Total", "value": "USD 1.240", "strong": true } ],
    "footer": "12 MAR 2026" } }
```

Two rules of thumb. Give the artifact room: at 700 px wide or more the type
inside it stays readable, and below about 400 px it turns into texture. And keep
the numbers real, because a fake dashboard reads as a fake dashboard.

Artifacts are a Plan Studio design. **Adding a new one** from a Basic workspace
comes back as `KAIZEN_REQUIRED`, whether it arrives as an `add_layer` op, inside
a `doc` you wrote, or inside a template that carries one. Nothing else changes:
a piece that already has an artifact is edited, moved, rendered, exported and
duplicated on any plan. If you hit the wall, solve the slide with type, shapes
or a photo and say what the Studio plan would unlock, instead of retrying.

---

## 5. Images: nothing renders a URL

A piece can only draw an image from the workspace library, by its `assetId`. No
layer takes a URL: an external one goes dead and the piece loses its photo.
**Look before you import**: `list_assets` is cheap, the user usually has their
own photos in there, and a second copy is clutter they have to clean up.

```
list_assets                     what the workspace already has
  -> list_backgrounds           the house textures, then import_background
  -> import_image_from_url      a specific image you have a URL for
  -> search_stock               find candidates, free to use commercially
     -> import_stock            save the one you picked
        -> set_image / background   place it in the piece
```

**`import_image_from_url({ url, kind })`** stores the file: jpeg, png, webp and
svg, up to 20 MB. Internal and private addresses are refused on every redirect,
because you read that URL somewhere. `kind: "logo"` lands it in the logo picker.

**`list_backgrounds` / `import_background({ slug })`** are the house collection:
neutral textures made for this product, with no credit to carry. They are files,
not assets, so they do not appear in `list_assets` until you copy one in. A
`textura` is opaque and covers the frame, a `trama` is nearly transparent and
needs a color background under it. The same slug twice returns the same asset.

**For a background texture, the house collection comes before stock.** Going to
Openverse for a texture puts a stranger's photo, CC BY credit and all, on a
piece where the user had the texture of their own brand one call away.

**`search_stock({ query, page })`** searches Openverse for photos free to use
commercially and to modify. Nothing is saved yet: the results are candidates
with a preview and a credit. Search in the subject's language, not the user's:
the bank indexes English metadata, so `boxing gym` beats `gimnasio de boxeo`.

**`import_stock({ id })`** saves one of those into the library. Send the id and
nothing else: the file URL and the credit come from the bank, which keeps a
photo from being stored under the wrong author. The credit comes back in
`list_assets` for the piece to carry. Import the one you chose, not three.

**A stock photo is the last resort, not the first.** A generic image of a
stranger in an office says nothing and looks like every other post in the feed.
The user's own photo, a texture, a shape, an `artifact` layer or type on a color
field all beat it. Never invent what a photo shows: place it, then look at it.

---

## 6. Beyond one piece

**`duplicate_piece({ pieceId, language })`** copies the design into another
language: same layout, same photos, fresh ids, title suffixed. The copy comes
back with the ORIGINAL words still in it, because translating is your job and
not the server's. Read the outline it returns, then rewrite the text layers and
the captions. Leave the layout alone, it already fits.

**`save_as_template({ pieceId, name, description })`** keeps the shape of a
piece that came out well, so later pieces can start from it with
`create_piece({ templateSlug })`. The words are kept too: a template of your own
is `I want to make this piece again`, not a blank layout.

**`check_brand({ pieceId })`** runs the deterministic check: a color or a font
that is not in the kit, a text block that does not fit its frame, type below the
readable floor, an empty layer, an image pointing at an asset that no longer
exists, text the exact same color as whatever sits behind it (sameness, not
contrast: dark grey on black passes). `error` will render wrong for sure;
`warning` is often a decision somebody made on purpose, so a literal the user
asked for lands here and stays exactly as it is. It says nothing about whether
the piece is good, only whether it is consistent: the last pass before you hand
a piece over, never an approval.

**`delete_piece({ pieceId })`** sends the piece to the trash, where the user can
restore it from Tu cuenta. `purge: true` deletes it for real, version history
included. Ask before either one, every time, even when they told you to clean
up: they cannot see which piece your description resolved to.

---

## 7. Errors, and what to do about each

Every error is `{ "error": CODE, "message": ..., "hint": ... }`. The `hint` is
written for you and usually contains the exact data you need to retry, such as
the list of layer ids that do exist.

| code | meaning | recovery |
| --- | --- | --- |
| `VERSION_CONFLICT` | someone saved while you worked, almost always the user watching their canvas | `get_piece`, look at what changed, rebase your ops and resend. Never resend the same `baseVersion`, and if their change conflicts with what you were about to do, say so instead of quietly winning |
| `LAYER_NOT_FOUND` | no such layer id | the hint lists every layer of the doc. Pick the right one |
| `SLIDE_NOT_FOUND` | no such slide id | the hint lists the slide ids |
| `INVALID_OP` | an op is malformed, or aimed at the wrong layer type | the hint says which fields that layer type accepts |
| `LIMIT_EXCEEDED` | 20 slides, 20 layers per slide, or 20 ops | split the batch, or remove before you add |
| `LAST_SLIDE` | you tried to delete the only slide | add one first, or delete the piece |
| `NOT_FOUND` | no such piece in this workspace | `list_pieces`. A piece in someone else's workspace answers identically |
| `INVALID_DOC` | a doc that cannot be recovered | usually zero slides or a missing `schemaVersion` |
| `TEMPLATE_NOT_FOUND` | bad slug | `list_templates` for the slugs this workspace saved |
| `EMPTY_PATCH` | `set_piece_meta` with nothing in it | send at least one field |
| `INVALID_IMAGE` | the URL did not answer with an image we accept | jpeg, png, webp or svg, public address. Do not retry the same URL |
| `FILE_TOO_LARGE` | over 20 MB | find a smaller version |
| `INVALID_QUERY` | empty stock query, or a page past 12 | narrow the search |
| `INVALID_RANGE` | `list_calendar` with `from` after `to` | send the earlier date as `from` |
| `KAIZEN_REQUIRED` | an artifact layer on a Basic workspace | solve the slide with type, shapes or a photo, and say what the Studio plan unlocks. Do not retry |
| `PRO_REQUIRED` | `cut_clip`, `get_reach_config` or `set_reach_config` on a Basic workspace | same: the feature is Studio only, so tell the user instead of retrying |
| `NOT_TRANSCRIBED` | the video project has no transcript yet | the user starts the transcription from the Videos section. Ask, then call again |
| `SERVER_NOT_CONFIGURED` | previews are not wired up in this deployment | nothing you can fix. Every other tool still works |
| `PREVIEW_FAILED` | the preview permit could not be issued | retry once |
| `STORAGE_ERROR` | a house background file could not be read | retry once, then use something else |
| `RATE_LIMITED` | the photo bank is throttling THIS SERVER | not the user's fault. Wait a minute, or work with `list_assets` |
| `UPSTREAM_ERROR` | the photo bank is down | retry once, then say so |
| `DB_ERROR`, `TOOL_FAILED` | the server had a problem | retry once, then stop and tell the user |
| `UNAUTHORIZED` | the key is invalid or revoked | the user creates a new one in Tu cuenta, section Agente |

---

## 8. Design rules

These are the difference between a piece that validates and a piece that ships.

**Contrast is not optional.** Text over a photo needs either
`$brand.inkInverse` plus an overlay on the background, or a shape behind it.
`check_brand` catches only the exact same color: one shade apart already passes.

**Respect the character budgets.** `maxChars` on a role is the number the layout
was drawn for. Going 20% over usually works; going double overflows the frame
and there is no reflow to save you.

**One idea per slide.** A carousel is read at speed. If a slide needs two
headlines it needs to be two slides.

**Do not invent facts.** Numbers, claims and names come from the user or from
the piece you are editing. If you need a statistic, ask for it. A confident
invented number is the worst thing you can put in someone else's brand.

**Do not author dead fields.** Write only the fields the renderer honors: the
ones in this document and in the doc you read back from `get_piece`. Anything
else is dropped with a warning, so inventing `shadow`, `padding` or `zIndex`
does not fail loudly, it does nothing while you believe you styled something.
Build the effect out of what exists (a shape behind the text) or leave it.

---

## 9. Writing covers that stop the scroll

The cover is the whole piece as far as the feed is concerned. Everything else
you wrote only gets read if the first line earns it.

**The hook is a promise the post has to keep.** A cover that promises more than
the slides deliver is worse than a boring one: it buys a swipe and spends the
reader's trust to do it. Write the hook after you know what the piece actually
proves, or write it first and then make the piece good enough to deserve it.

**Eight words or fewer on the cover.** A hook that needs a second line to work
is not a hook yet, it is a summary. Cut words until taking one more out would
break the sentence.

**The screenshot test.** Read line 1 alone, as if you had seen it in a
screenshot with no brand, no image and no context. If it reads like generic
marketing (`Grow your business with these tips`), it is not a hook. Rewrite it
until it could only have been written about this specific thing.

**Skip or stay.** Every cover falls into one of these columns, and the reader
decides in about a second.

| skip | stay |
| --- | --- |
| literal | emotional |
| generic | specific |
| functional | intriguing |
| about the product | about the reader |

Five moves get a line from the left column to the right one.

1. **Desire over literal.** Not what the thing is, what it gets them.
   `Meal planning app` becomes `Never ask what's for dinner again`.
2. **Intrigue over instruction.** An open loop beats a command.
   `Follow these 5 steps` becomes `The step everyone skips`.
3. **Specific over generic.** A number, a name, a date, a real detail.
   `We grew fast` becomes `From 12 clients to 60 in one winter`.
4. **Reader identity over product.** Put them in the sentence.
   `Our new plan` becomes `For the coach with a waiting list`.
5. **Transformation over static.** Show the before and the after.
   `Better bookkeeping` becomes `Sunday nights back`.

**Do not reuse a hook within 30 days.** The feed remembers even when the writer
does not, and the same opening twice in a month reads as a template. Call
`list_pieces` and look at what has already gone out before you settle on a line.

---

## 10. The story arc

A carousel is one argument told in swipes, not a slide deck of related thoughts.

**The cover has to make sense alone.** Most people will only ever see it. If it
only works once you have read slide 2, it does not work.

**Slide 2 is never just the punchline.** If the answer to the cover fits on
slide 2, the piece is a single image, not a carousel. Slide 2 is where the
promise gets sharpened: the stake, the cost, the thing they already suspected.

**Each slide earns the next swipe.** One idea per slide, and the last line of a
slide should leave something open. A slide that closes its own loop completely
is where the reader stops.

**Read the slides out loud, in order, as the last thing you do.** If you
stumble, or if two slides could swap places without anyone noticing, the arc is
not there yet and no amount of layout will fix it.

---

## 11. Video: clips out of a long recording

The user uploads a long thing (a talk, an interview, a recorded call). The
server transcribes it locally with whisper, and from then on the recording is
text with timestamps on it. **Choosing which moments deserve to be clips is your
job.** There is no `propose_clips` tool because there is no model on our side:
we hand you the transcript, you decide, we execute the cut.

```
list_video_projects            what is there, and whether it has a transcript
  -> get_transcript            segments with start/end in seconds
     -> cut_clip({ ranges })   one clip, rendered and reframed
```

**A project is only workable at `ready`.** `uploaded` means nobody asked for the
transcript yet and the user starts that from the app; `working` means whisper is
running, so wait and call again; `failed` carries the reason in `error`.

**Timestamps are seconds on the original recording**, floats, exactly as
`get_transcript` gives them. Do not convert to `mm:ss` and back, and do not
invent a timestamp that is not in a segment you read.

**Ranges are a list, and that is the whole point.** Several ranges become ONE
clip, concatenated in time order. That is how you drop the throat clearing in
the middle of a good answer, or stitch a claim at 4:10 to the proof at 11:35.
Ranges that overlap or touch get merged, so do not be careful about that.

```
cut_clip({
  projectId: "b1...",
  title: "Por qué el mes dos es el que duele",
  ranges: [{ start: 250.5, end: 268.0 }, { start: 695.2, end: 712.4 }]
})
-> { clipId: "c9...", status: "ready", durationSeconds: 34.7,
     aspect: "9:16", url: "https://...signed..." }
```

**What the cut does for you**, so you do not ask for it: a centred crop to the
aspect (9:16 by default, no letterboxing), captions burned in from the word
level timings, and loudness normalized. `captions: false` turns the subtitles
off; `captionStyle: "plain"` drops the dark box behind them.

**Length is the discipline.** A clip that needs 90 seconds to land is usually
two clips or none. The hard ceiling is 5 minutes, and never be near it.

**Cutting is a Plan Studio feature.** `list_video_projects` and `get_transcript`
read on any plan, but `cut_clip` from a Basic workspace answers `PRO_REQUIRED`
because the cut renders. Read the transcript, hand the user the ranges you would
have cut, and tell them what the Studio plan unlocks. Do not retry.

**The url expires.** Hand it to the user in your reply and do not promise it
will work tomorrow. The clip itself lives in their Videos section.

**A failed cut answers `status: "failed"` with the reason, not an error.** The
row exists in the user's list with the reason attached. Read it and tell them
what it says: retrying the same ranges will fail the same way.

---

## 12. A full session

The user says: "make a carousel about why most gyms lose members in month two,
schedule it for next Tuesday."

```
1. get_brand_kit()
   -> colors, fonts, voice: "Direct, no hype. Talks about work done,
      not promises. Never uses exclamation marks."

2. list_templates()
   -> { templates: [] }
   A new workspace: nothing saved yet, so you design the doc yourself. (If a
   saved template had matched, create_piece({ templateSlug }) reuses it.)

3. create_piece({ title: "Why members leave in month two",
                  doc: <the six slide doc you design with section 5: a headline
                        cover, step plus body pairs, every color and font a
                        $brand ref, text within the budgets of section 6> })
   -> { pieceId: "9f...", version: 1, warnings: [], outline: [
        { index: 0, slideId: "sl_x1", layers: [
            { layerId: "ly_h1", type: "text", role: "headline", text: "..." } ] },
        ... ] }

4. update_piece({ pieceId: "9f...", baseVersion: 1, ops: [
     { op: "set_text", layerId: "ly_h1",
       content: "Most members leave in\nmonth two" },
     { op: "set_text", layerId: "ly_s2", content: "The cliff" },
     { op: "set_text", layerId: "ly_b2",
       content: "Week one is motivation. Week six is habit. The gap between
                 them is where the churn lives." },
     ...,
     { op: "set_captions", captions: {
         "instagram": { "text": "..." }, "linkedin": { "text": "..." } } } ] })
   -> { version: 2, warnings: [], outline: [...] }

5. check_brand({ pieceId: "9f..." })
   -> { counts: { slides: 6, layers: 19, errors: 0, warnings: 1 },
        findings: [ { rule: "overflow", severity: "warning", slide: 3,
                      layerId: "ly_b3", detail: "..." } ] }

6. update_piece({ pieceId: "9f...", baseVersion: 2, ops: [
     { op: "set_text", layerId: "ly_b3", content: "<the same idea, shorter>" } ] })
   -> { version: 3, warnings: [] }

7. render_preview({ pieceId: "9f..." })
   -> { previewUrl: "https://theagentcy.app/export/9f...?t=...&scale=0.5",
        expiresAt: "...", note: "HTML page, not an image" }

8. set_piece_meta({ pieceId: "9f...", plannedDate: "2026-08-25",
                    category: "playbook", status: "approved" })
   -> { pieceId: "9f...", status: "approved", plannedDate: "2026-08-25" }
```

Then tell the user what you built, in one short paragraph: the angle you took,
how many slides, when it is scheduled, and the preview link. Not a slide by
slide recap, which they can see by opening it.

---

## 13. Connecting

The server speaks Streamable HTTP at `https://theagentcy.app/api/mcp` and needs
an API key on every request, as `Authorization: Bearer ag_...`. Keys are created
in the app under Tu cuenta, section Agente, and each one is shown exactly once.

One key scopes one workspace. Everything above happens inside it, and there is
no tool that takes a workspace as an argument, because there is nothing else you
are allowed to see.
---

_Fuente: https://theagentcy.app/skill — descargado el 2026-08-25. Si el producto cambia, volver a bajar esa URL y reemplazar todo lo que está debajo del frontmatter._
