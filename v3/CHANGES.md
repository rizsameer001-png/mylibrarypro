# Changed Files — Drop into existing project at same paths

## server/src/controllers/bookController.js
- updateBook now correctly recalculates availableCopies when totalCopies changes
  (preserves already-issued copies: available = total - issued_out)
- Digital books always get totalCopies=0, availableCopies=0

## server/src/utils/seed.js
- Membership plans now explicitly set isActive:true
  (insertMany bypasses Mongoose schema defaults so plans were invisible on homepage)

## client/src/components/books/BookDigitalSettings.jsx
- Fixed: now checks book.cloudinaryPublicId (not old book.digitalFileKey/s3Key)
- Fixed: Toggle uses static Tailwind classes (dynamic bg-${color}-600 doesn't work)
- Added: upload progress bar and percentage display
- Added: Free Download toggle (downloadEnabled field)
- Added: live price preview using currency context

## client/src/pages/BookDetail.jsx
- Fixed: canReadOnline logic — "any" access level works for non-logged-in users
- Fixed: guests see "Login to Read Online" / "Login to Purchase" prompts
- Fixed: Free Download button works independently from sale gate
- Added: LockClosedIcon shown when feature requires login

## client/src/pages/Home.jsx
- Fixed: StarIcon import changed to @heroicons/react/24/solid for filled stars
- Membership Plans section was already correct — issue was seed data not setting isActive
