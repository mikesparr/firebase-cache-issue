# Firebase cache issue
This is a simple attempt to test out a caching issue with Firebase admin, 
using Koa node framework (killing 2 birds and checking it out).

# Requirements
You will need to set up a Firebase project, and download a service key to your computer.

# Install
```
git clone git@github.com:mikesparr/firebase-cache-issue.git
cd firebase-cache-issue
npm install
cp /path/to/downloaded/serviceKey.json ./service-key.json
```

# Test
```
npm test
```

After testing this, I could not recreate the issue I'm witnessing with another app. At least this proves it works, but other app has 300K records updated. My suspicion is there is lag time perhaps on Firebase side with bulk update, causing false positive, so more tests must be performed.

# Run
```
npm start
```

Then visit http://localhost:3000 in your browser for "Hello, world". The main purpose of the app is to run the TEST and test caching.
