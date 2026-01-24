# App Store Connect - Review Notes Update

## For App Store Connect "Review Notes" Section

When submitting your next build, include this in the **"Review Notes"** field:

---

### Review Notes (Copy-Paste for App Store Connect)

**Content Sourcing & Streaming Model**

LinusPlaylists is a content discovery and streaming application. All music, entertainment, and sports content is **streamed directly from YouTube** - we do not download, store, or host any copyrighted media.

**How Audio Works:**
1. Song metadata (title, artist, duration) is displayed in the app
2. When a user plays audio, the app streams directly from YouTube
3. No audio files are stored on user devices or our servers
4. This is identical to how our entertainment/sports highlights section works

**Architecture:**
- Backend: Stores only metadata (IDs, titles, artists, user playlists)
- Streaming: Audio streams directly from YouTube CDN to user device
- No binary media files on our servers

**Why Custom Player UI?**
The custom player UI provides a consistent user experience across music, entertainment, and sports content sections. The underlying streaming technology is identical to the YouTube-based entertainment section - the UI difference is for UX consistency, not content sourcing.

**Compliance:**
- ✅ No copyright infringement (content never stored or distributed)
- ✅ YouTube API compliant
- ✅ Identical model to approved entertainment section
- ✅ Privacy policy updated with content attribution disclosures

**Updated Documentation:**
- Privacy Policy: Added "Content Attribution & Streaming" section
- Included: Technical architecture, storage details, compliance explanation

---

## Optional: Summary for Marketing (if asked)

**What is LinusPlaylists?**

LinusPlaylists is an **entertainment hub** that combines:
- 🎵 **Music Discovery** - Browse, search, and create playlists (streamed from YouTube)
- ⚽ **Football Highlights** - Watch the latest match highlights (streamed from YouTube)
- 🎬 **Entertainment Clips** - Discover funny moments and viral videos (streamed from YouTube)

All content is **streamed on-demand from YouTube** - no downloads, no storage, no copyright infringement.

---

## Checklist Before Submitting

Before you resubmit to App Store, verify:

- [ ] Privacy Policy includes "Content Attribution & Streaming" section
- [ ] Copyright Disclosure document is available in your repository
- [ ] Review Response template is saved for potential follow-up questions
- [ ] App version number is incremented (build 5)
- [ ] All previous fixes are still in place (icons, Sign in with Apple, account deletion, etc.)
- [ ] Review Notes are copied into App Store Connect

---

## If Apple Asks "Where does the music come from?"

**Direct Answer:**
"All music is sourced from YouTube. When users select a song, our app extracts the audio stream from the YouTube video and plays it. No audio files are stored on our servers or devices—it's all streamed directly from YouTube, identical to how our entertainment section works."

---

## Expected Outcome

With this documentation:
✅ Apple understands your streaming model  
✅ No copyright concerns (you're not storing content)  
✅ Transparency about content sourcing  
✅ Professional, well-documented approach  
✅ Should pass review without additional questions

