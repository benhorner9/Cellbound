# Design Booth — team handover guide

**Purpose:** Create and maintain playable content without editing game source files. Open the **Admin** view, then **Design Booth**. The booth is currently restricted to the **owner role**; do not share owner credentials. Giving other contributors access requires dedicated staff roles and matching Supabase row-level policies.

## Start with a task

The buttons below **What do you want to do?** are the fastest way to get anywhere. **Create game content** opens the new Content Creator, the permanent library for reusable gameplay ingredients:

| You want to… | Open |
| --- | --- |
| Make a new room, boss/encounter, comic scene or puzzle | **Create game content** |
| Make a balanced, loot-eligible equipment variant | **Create game content → Equipment item** |
| Build a quest, dungeon or raid | **Build an adventure** |
| Add or change boss rewards | **Edit boss loot** |
| Find an item's tier, class, ID or source | **Find an item** |
| Replace existing comic panels | **Edit comic art** |
| Inspect or position things in an existing room | **Edit dungeon rooms** |

**More tools** contains the Character Models fit viewer, Dungeon Planner and reusable Minigame Library. These are secondary tools, not required for routine authoring.

## Create new content and reuse existing work

Use **Build an adventure** to build a completely new **quest, dungeon or raid**. All three support comic-strip stages, room transitions, fights with custom drops, and reusable minigames. This is the current no-code creation workflow.

You can also start from something that works already:

- Open an existing Adventure Builder project and choose **Copy to New Draft**. This creates a separate **unpublished** adventure with new project and stage identifiers, while keeping the story, encounter settings, artwork references and loot settings. The source adventure stays untouched.
- When you need a similar room, fight, puzzle or comic panel sequence, open that stage and choose **Duplicate Stage**. The duplicate is inserted immediately afterward with a unique ID; edit it separately.
- Copied content is not automatically cloud-saved or published. Rename it, review any inherited art or boss rewards, then **Save Cloud Draft**, **Test From Stage** and **Publish to Game** as usual.

**Important current boundaries:** the separate Item Catalogue is read-only; it cannot create or equip a new item yet. The **Comic Art** and **Room Layouts** tabs still edit existing built-in scenes; create new reusable scenes under **Content Creator**, and insert them into an adventure. The Content Creator currently does not splice new rooms into the hard-coded original dungeons or create entirely new equipment appearances. Staff roles, approvals, rollback, fully original item appearance/stat authoring, and extensible new combat mechanics still need dedicated work.

## Use the Content Creator (reusable content library)

1. Select **Create game content** from the Design Booth front page.
2. Choose **+ Room / transition**, **+ Boss or encounter**, **+ Comic scene**, **+ Puzzle / minigame**, or **+ Equipment item**.
3. Give it a useful name and fill in the editor. Upload background or comic-panel art where required. A boss uses the game's shared combat engine and approved mechanics; items select an existing Tier 1 or Tier 2 base gear item for safe combat values.
4. **Save Cloud Draft** to keep the work on the server. This does **not** publish anything. Reopen it later from the Content Library sidebar.
5. For scenes, select **Add to Adventure** to insert a new independent stage into the current quest, dungeon or raid. In Adventure Builder, use **Save as Template** on an existing stage to start a reusable library entry. Changes to the copied stage do not affect its template.
6. Select **Publish Content** when the content is complete. Published new T1–T2 equipment variants appear in the normal shared gear registry and may become available to eligible designed or existing-boss loot tables. Assign actual drop chances in **Drop Tables**.
7. **Published template** does not mean it automatically appears as a new dungeon. Build and publish the adventure with its stages, rewards and art separately.

Content templates are cloud-backed and owner-restricted, and a published template retains the last published version while you edit its draft. A published template cannot be deleted using the booth, to protect existing item IDs. Regular players see only published records.

## Make a new adventure

1. Choose **Create an adventure**, then **+ QUEST**, **+ DUNGEON** or **+ RAID**. Give it a descriptive name and minimum level.
2. Choose a stage on the left; edit its title, description and required background or comic panel art. Use **Add Stage** to insert more scenes, encounters or minigames. Use the up/down arrows to reorder a stage.
3. To configure a fight's drops, choose **Manage This Boss's Loot**. Use **Add Item**, pick an existing item from the list and set its individual percentage. Equipment and material restrictions are explained in that editor.
4. Read the **Before publishing** checklist. Each stage problem is clickable and opens the relevant stage. Fix all publication blockers.
5. Select **Save Cloud Draft**. Changes are also backed up on the current device during editing, but **only a cloud save moves between devices**.
6. Select **Test From Stage** to preview gameplay. Test previews and raid prototypes do not award real loot.
7. Once reviewed, select **Publish to Game** and confirm. **Publishing is separate from saving a draft**. Players continue using the previously published version until the new version is published.

## Update an existing boss's rewards

1. Select **Edit boss loot**, then choose the boss from the dropdown. *Existing Game Boss* tables are **additional** drops only, not replacements for original dungeon completion rewards.
2. Use **Add Item** or **Edit** and adjust chance or quantity; percentages are **independent rolls**. Use search/sort to check which rewards are already assigned.
3. Press **Save Boss Drops** to apply an existing-game boss change. Press **Discard Edits** to restore the previous saved drop list. Leaving a boss with unsaved changes prompts before discarding.
4. For bosses created in **Adventure Builder**, select **Save Cloud Draft** and then **Publish Loot Changes**. These are changes to an adventure blueprint, not the separate native-boss table.
5. If an item is missing or disallowed, check **Item Catalogue**. It indexes more items than the boss-drop picker permits; higher-tier, restricted and raid-exclusive gear are deliberately unavailable in this editor.

## Working with comic artwork and captions

1. Choose **Edit comic art** and search for the scene or filter for missing artwork.
2. Select a panel, choose an image, and check the preview.
3. **Upload & Publish** changes the scene's artwork for players immediately; verify it in the game after the upload finishes.
4. **Save Draft** for panel headings and story text only saves a **local draft on this device**. Use **Export All Drafts** and give the export to a developer for the text/source update. Do not tell someone that changing comic text has been published.
5. Use **Preview Strip** before marking the scene reviewed.

## Working with room layouts

1. Choose **Edit dungeon rooms**, then select a dungeon/raid and room.
2. Move entrance, exit, party and enemy markers on the room artwork.
3. **Save Draft** keeps your marker layout on this device; **Test Layout** applies it only to the owner's current game session.
4. **Publish Layout** makes the marker positions available to staging players. A separate **Upload & Publish Background** action updates room art; don't confuse the two.
5. Always enter the dungeon on staging and check positioning, collision, combat and the transition to the next room.

## Before handing a task to someone else

Use clear tickets: name the **dungeon / boss / quest**, specify exactly **which screen or stage**, provide the **required asset** or a link, and state whether they should **draft, test or publish**. Every completed task should record what changed, what was tested and whether it is live. Do not grant shared owner access as a shortcut.

## Safeguards and troubleshooting

- **Unsaved on this device** means the cloud has not been updated. Save before switching devices, clearing Safari data or sharing work.
- Unfinished local adventures are listed in **Projects** with **On this device · Not cloud saved**. Reopen one to continue; do not assume another device has that draft.
- The checklist may prevent Publish when art, names or a drop rule is invalid. Follow its stage links. Saving a draft is still allowed.
- Do not close the booth while artwork is uploading or a save is in progress. It blocks navigation until the operation finishes.
- A local recovery copy can conflict with newer cloud edits. Read the conflict prompt carefully and choose which version should win.
- When boss rewards are saved, confirm them on the relevant staging boss. Existing game rewards are not overwritten by the optional drop table.
- If a change looks missing after deployment, refresh the game page and verify you are in the correct environment. Do not publish production updates without a review.

## Handover checklist for every new editor

- [ ] Can locate the five common tasks without help.
- [ ] Can create and reopen a local-only draft, then save it to the cloud.
- [ ] Can duplicate a project or stage without changing the existing published content.
- [ ] Can create a reusable boss/room/comic template, save it to cloud and insert it into an adventure.
- [ ] Can publish a balanced Tier 1–2 gear variant and select it in a valid boss drop table.
- [ ] Can fix a missing-art issue using the publication checklist.
- [ ] Can test without accidentally publishing.
- [ ] Understands the difference between additional existing-boss drops and custom adventure drops.
- [ ] Can check a tier/class in Item Catalogue, change a boss drop and discard an unwanted edit.
- [ ] Understands that production publishing and permission changes require approval.

## Known limits

The booth is a **content tool, not a source-code editor**. New minigame logic and new playable engine behaviour still require a code change and gameplay QA. Staff access is **not** yet enabled; secure staff roles and audit logs must be implemented before other contributors can log in independently. Local draft recovery protects against accidental navigation, but it is **not** a replacement for a cloud save.
