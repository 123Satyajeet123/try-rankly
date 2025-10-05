# How to Clear Browser Storage

If you deleted your database collections and getting "Invalid token" errors, you need to clear the old tokens from your browser's localStorage.

## Method 1: Use Browser DevTools (Recommended)

1. Open your browser
2. Press `F12` or `Right Click → Inspect` to open DevTools
3. Go to the **Console** tab
4. Paste this command and press Enter:

```javascript
localStorage.clear()
```

5. Reload the page (`F5` or `Ctrl+R`)
6. ✅ You should now be redirected to login/onboarding!

---

## Method 2: Application Tab in DevTools

1. Open DevTools (`F12`)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. In the left sidebar, expand **Local Storage**
4. Click on your domain (e.g., `http://localhost:3000`)
5. You'll see stored items like:
   - `authToken`
   - `refreshToken`
   - etc.
6. Right-click on the domain and select **Clear**
7. Reload the page

---

## Method 3: Incognito/Private Mode

Just open an incognito/private browsing window:
- Chrome: `Ctrl+Shift+N` (Windows/Linux) or `Cmd+Shift+N` (Mac)
- Firefox: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
- Safari: `Cmd+Shift+N` (Mac)

Then visit `http://localhost:3000` - it will have fresh storage!

---

## When to Clear Storage

Clear localStorage when:
- ❌ You deleted database collections manually
- ❌ Getting "Invalid token" errors
- ❌ Stuck in a weird auth state
- ❌ Testing fresh user experience

---

## What Gets Cleared

Clearing localStorage removes:
- 🔑 Authentication tokens
- 👤 User session data
- 📊 Any cached data

You'll need to:
- Log in again
- Complete onboarding again (if testing)

---

## Quick Fix Script

If you're developing and need to clear storage frequently, you can add this to your browser bookmarks:

**Bookmark Name:** Clear Rankly Storage

**Bookmark URL:**
```javascript
javascript:(function(){localStorage.clear();location.reload();})()
```

Just click the bookmark and it will clear storage and reload!

---

## Expected Behavior After Clearing

1. Visit `http://localhost:3000`
2. ✅ Redirected to `/onboarding`
3. ✅ See login/signup form
4. ✅ **NO console errors!**
5. ✅ Clean slate for testing

---

## Still Having Issues?

If you cleared storage and still seeing errors:

1. **Hard reload:** `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. **Clear browser cache:** Settings → Privacy → Clear browsing data
3. **Check backend is running:** Make sure `node src/index.js` is running
4. **Check MongoDB is running:** `mongosh` should connect
5. **Restart both servers:**
   ```bash
   # Kill both terminals (Ctrl+C)
   # Restart backend
   cd backend && node src/index.js
   # Restart frontend
   npm run dev
   ```

---

## For Production/Deployment

In production, invalid tokens will be handled gracefully:
- User will be logged out automatically
- Redirected to login page
- No scary error messages
- Clean user experience

This is expected behavior when tokens expire or database is reset!
