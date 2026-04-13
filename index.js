import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import { marked } from "marked";
import session from "express-session";
import bcrypt from "bcryptjs";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

dotenv.config();

const app = express();
const port = 3000;


// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


// ─── IN-MEMORY STORAGE ────────────────────────────────────────────────────────

let posts = [];
let users = []; // { id, username, email, passwordHash, googleId }


// ─── PASSPORT: SERIALIZE / DESERIALIZE ───────────────────────────────────────

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => {
  const user = users.find(u => u.id === id);
  done(null, user || false);
});


// ─── PASSPORT: GOOGLE OAUTH ──────────────────────────────────────────────────

passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  "http://localhost:3000/auth/google/callback"
  },
  (_accessToken, _refreshToken, profile, done) => {
    // Find or create the user
    let user = users.find(u => u.googleId === profile.id);
    if (!user) {
      user = {
        id:           profile.id,
        googleId:     profile.id,
        username:     profile.displayName,
        email:        profile.emails?.[0]?.value || "",
        passwordHash: null
      };
      users.push(user);
    }
    return done(null, user);
  }
));


// ─── REQUIRE AUTH MIDDLEWARE ──────────────────────────────────────────────────

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}


// ─── AUTH: REGISTER ───────────────────────────────────────────────────────────

app.get("/register", (_req, res) => {
  res.render("register.ejs", { error: null });
});

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (users.find(u => u.email === email)) {
    return res.render("register.ejs", { error: "Email already registered." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: Date.now().toString(),
    username,
    email,
    passwordHash,
    googleId: null
  };
  users.push(user);

  req.login(user, err => {
    if (err) return res.render("register.ejs", { error: "Something went wrong." });
    res.redirect("/");
  });
});


// ─── AUTH: LOGIN ──────────────────────────────────────────────────────────────

app.get("/login", (_req, res) => {
  res.render("login.ejs", { error: null });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);

  if (!user || !user.passwordHash) {
    return res.render("login.ejs", { error: "Invalid email or password." });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.render("login.ejs", { error: "Invalid email or password." });
  }

  req.login(user, err => {
    if (err) return res.render("login.ejs", { error: "Something went wrong." });

    // If a returnTo URL was saved (e.g. from LinkedIn share), go there
    const returnTo = req.session.returnTo;
    delete req.session.returnTo;
    res.redirect(returnTo || "/");
  });
});


// ─── AUTH: GOOGLE ─────────────────────────────────────────────────────────────

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    const returnTo = req.session.returnTo;
    delete req.session.returnTo;
    res.redirect(returnTo || "/");
  }
);


// ─── AUTH: STATUS (used by LinkedIn share in main.js) ────────────────────────

app.get("/auth/status", (req, res) => {
  res.json({ loggedIn: req.isAuthenticated() });
});


// ─── AUTH: LOGOUT ─────────────────────────────────────────────────────────────

app.get("/logout", (req, res) => {
  req.logout(err => {
    if (err) console.error(err);
    res.redirect("/login");
  });
});


// ─── HOME ─────────────────────────────────────────────────────────────────────

app.get("/", requireAuth, (req, res) => {
  res.render("index.ejs", { posts, username: req.user.username });
});


// ─── CREATE POST (manual form) ────────────────────────────────────────────────

app.get("/new", requireAuth, (_req, res) => {
  res.render("new.ejs");
});

app.post("/new", requireAuth, (req, res) => {
  const newPost = {
    id:        Date.now().toString(),
    title:     req.body.title,
    author:    req.body.author || req.user.username,
    content:   req.body.content,
    createdAt: new Date().toLocaleString()
  };
  posts.push(newPost);
  res.redirect("/");
});


// ─── VIEW SINGLE POST ─────────────────────────────────────────────────────────

app.get("/post/:id", requireAuth, (req, res) => {
  const post = posts.find(p => p.id === req.params.id);
  if (!post) return res.redirect("/");
  // Convert markdown → HTML on the server (handles **bold**, images, headings)
  const renderedContent = marked.parse(post.content);
  res.render("post.ejs", { post, renderedContent });
});


// ─── EDIT POST ────────────────────────────────────────────────────────────────

app.get("/post/:id/edit", requireAuth, (req, res) => {
  const post = posts.find(p => p.id === req.params.id);
  if (!post) return res.redirect("/");
  res.render("edit.ejs", { post });
});

app.post("/post/:id/edit", requireAuth, (req, res) => {
  const post = posts.find(p => p.id === req.params.id);
  if (!post) return res.redirect("/");
  post.title   = req.body.title   || post.title;
  post.author  = req.body.author  || post.author;
  post.content = req.body.content || post.content;
  res.redirect(`/post/${req.params.id}`);
});


// ─── DELETE POST ──────────────────────────────────────────────────────────────

app.post("/posts/:id/delete", requireAuth, (req, res) => {
  posts = posts.filter(p => p.id !== req.params.id);
  res.redirect("/");
});


// ─── PUBLISH AI BLOG ──────────────────────────────────────────────────────────

app.post("/publish-ai-blog", requireAuth, (req, res) => {
  const { blog } = req.body;
  if (!blog) return res.status(400).json({ success: false, error: "No content" });

  const newPost = {
    id:        Date.now().toString(),
    title:     blog.split("\n")[0].replace(/^#+\s*/, "").substring(0, 80) || "AI Blog",
    author:    req.user.username,
    content:   blog,
    createdAt: new Date().toLocaleString()
  };

  posts.push(newPost);
  res.json({ success: true, post: newPost });
});


// ─── AI BLOG GENERATOR ────────────────────────────────────────────────────────

app.post("/generate-blog", requireAuth, async (req, res) => {

  const prompt = req.body?.prompt;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  if (!prompt.toLowerCase().includes("blog")) {
    return res.json({
      error: "This generator only creates blog articles. Please include the word 'blog' in your prompt."
    });
  }

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "user",
            content: `Write a professional blog about ${prompt}. Include headings and paragraphs.`
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const blog = response.data.choices[0].message.content;
    res.json({ blog });

  } catch (error) {
    console.log(error.response?.data || error.message);
    res.status(500).json({ error: "AI generation failed" });
  }

});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});












