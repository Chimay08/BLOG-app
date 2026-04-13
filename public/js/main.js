document.addEventListener("DOMContentLoaded", () => {

  /* ===============================
     STAGGER POST CARDS
  =============================== */

  document.querySelectorAll(".post-card").forEach((card, i) => {
    card.style.animationDelay = `${0.42 + i * 0.08}s`;
  });


  /* ===============================
     ADD POST MODAL
  =============================== */

  const addBtn = document.getElementById("addPostBtn");
  const postModal = document.getElementById("postModal");
  const closeModal = document.getElementById("closeModal");

  if(addBtn && postModal){
    addBtn.addEventListener("click", () => {
      postModal.classList.add("show");
    });
  }

  if(closeModal && postModal){
    closeModal.addEventListener("click", () => {
      postModal.classList.remove("show");
    });
  }

  /* ===============================
     IMAGE UPLOAD + PREVIEW + INSERT
  =============================== */

  const imageUploadBtn   = document.getElementById("imageUploadBtn");
  const imageUpload      = document.getElementById("imageUpload");
  const imgPreviewPopup  = document.getElementById("imgPreviewPopup");
  const imgPreviewOverlay= document.getElementById("imgPreviewOverlay");
  const imgPreviewThumb  = document.getElementById("imgPreviewThumb");
  const imgInsertBtn     = document.getElementById("imgInsertBtn");
  const imgCancelBtn     = document.getElementById("imgCancelBtn");
  const contentTextarea  = document.getElementById("contentInput");

  // tracks cursor position before popup opens
  let savedCursorPos = null;
  let currentObjectUrl = null;

  function closeImgPopup(){
    imgPreviewPopup.classList.remove("show");
    imgPreviewOverlay.classList.remove("show");
    // reset file input so same file can be re-selected
    imageUpload.value = "";
  }

  // open file picker on button click — save cursor position first
  if(imageUploadBtn && imageUpload){
    imageUploadBtn.addEventListener("click", () => {
      if(contentTextarea){
        savedCursorPos = contentTextarea.selectionStart;
      }
      imageUpload.click();
    });

    // when file is chosen → show preview popup
    imageUpload.addEventListener("change", () => {
      const file = imageUpload.files[0];
      if(!file || !file.type.startsWith("image/")) return;

      // revoke previous object URL to avoid memory leaks
      if(currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = URL.createObjectURL(file);

      imgPreviewThumb.src = currentObjectUrl;
      imgPreviewPopup.classList.add("show");
      imgPreviewOverlay.classList.add("show");
    });
  }

  // Insert into Post — inserts markdown at saved cursor position
  if(imgInsertBtn){
    imgInsertBtn.addEventListener("click", () => {
      if(!currentObjectUrl || !contentTextarea) return;

      const markdownImg = `![image](${currentObjectUrl})`;
      const pos  = savedCursorPos ?? contentTextarea.value.length;
      const before = contentTextarea.value.substring(0, pos);
      const after  = contentTextarea.value.substring(pos);

      contentTextarea.value = before + markdownImg + after;

      // restore cursor to end of inserted text
      const newPos = pos + markdownImg.length;
      contentTextarea.setSelectionRange(newPos, newPos);
      contentTextarea.focus();

      closeImgPopup();
    });
  }

  // Cancel — close popup without inserting
  if(imgCancelBtn){
    imgCancelBtn.addEventListener("click", closeImgPopup);
  }

  // clicking overlay also cancels
  if(imgPreviewOverlay){
    imgPreviewOverlay.addEventListener("click", closeImgPopup);
  }


  /* ===============================
     AI CHAT POPUP
  =============================== */

  const aiBtn = document.getElementById("aiBtn");
  const aiPopup = document.getElementById("aiPopup");
  const closeAi = document.getElementById("closeAi");

  if(aiBtn && aiPopup){
    aiBtn.addEventListener("click", () => {
      aiPopup.classList.toggle("active");
      aiBtn.classList.toggle("active");
    });
  }

  if(closeAi && aiPopup){
    closeAi.addEventListener("click", () => {
      aiPopup.classList.remove("active");
      aiBtn.classList.remove("active");
    });
  }


  /* ===============================
     AI BLOG GENERATOR
  =============================== */

  const generateBtn = document.getElementById("generateBtn");
  const aiResult = document.getElementById("aiResult");
  const promptInput = document.getElementById("promptInput");

  if(generateBtn){
    generateBtn.addEventListener("click", async () => {

      const prompt = promptInput.value.trim();

      if(!prompt){
        alert("Please write something 🙂");
        return;
      }

      aiResult.innerHTML = "Generating blog... ✨";

      try{
        const response = await fetch("/generate-blog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt })
        });

        if(!response.ok) throw new Error("Server error");

        const data = await response.json();

        aiResult.innerHTML = formatBlog(data.blog);
        showActionButtons(data.blog);

      }catch(err){
        console.error(err);
        aiResult.innerHTML = "⚠️ AI failed. Try again.";
      }

    });
  }


  /* ===============================
     SHARE TO LINKEDIN (existing posts)
  =============================== */

  document.querySelectorAll(".share-linkedin-btn").forEach(btn => {
    btn.addEventListener("click", handleLinkedInShare);
  });

});



/* ===============================
   FORMAT BLOG (GLOBAL)
=============================== */

function formatBlog(text){
  return text
    .replace(/\*\*(.*?)\*\*/g, "<h3>$1</h3>")
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");
}



/* ===============================
   ACTION BUTTONS
=============================== */

function showActionButtons(blog){

  const oldButtons = document.querySelector(".ai-actions");
  if(oldButtons) oldButtons.remove();

  const aiResult = document.getElementById("aiResult");

  const buttons = `
    <div class="ai-actions">
      <button id="publishAiBlog" class="publish-btn">
        🚀 Publish Blog
      </button>
      <button id="downloadAiBlog" class="download-btn">
        ⬇ Download
      </button>
    </div>
  `;

  aiResult.insertAdjacentHTML("afterend", buttons);


  /* ===== Publish ===== */

  document.getElementById("publishAiBlog").addEventListener("click", async () => {

    const response = await fetch("/publish-ai-blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blog })
    });

    const data = await response.json();

    if(data.success){
      addPostToUI(data.post);

      // clear AI popup
      const promptInput = document.getElementById("promptInput");
      const aiResult = document.getElementById("aiResult");
      if(promptInput) promptInput.value = "";
      if(aiResult) aiResult.innerHTML = "";
      document.querySelector(".ai-actions")?.remove();

      const aiPopup = document.getElementById("aiPopup");
      const aiBtn = document.getElementById("aiBtn");
      if(aiPopup) aiPopup.classList.remove("active");
      if(aiBtn) aiBtn.classList.remove("active");
    }

  });


  /* ===== Download ===== */

  document.getElementById("downloadAiBlog").addEventListener("click", () => {

    const blob = new Blob([blog], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "AI_Blog.txt";
    a.click();

  });

}



/* ===============================
   ADD POST TO UI (no reload)
=============================== */

function addPostToUI(post){

  const blogBox = document.querySelector(".blog-box");
  const emptyMsg = blogBox.querySelector(".empty-msg");
  if(emptyMsg) emptyMsg.remove();

  const card = document.createElement("div");
  card.className = "post-card";
  card.style.animationDelay = "0s";

  // delete form
  const form = document.createElement("form");
  form.action = `/posts/${post.id}/delete`;
  form.method = "POST";
  form.className = "delete-post-form";
  form.innerHTML = `<button type="submit" class="delete-post-btn" aria-label="Delete post"><i class="bi bi-x-lg"></i></button>`;

  // title — links to the full post page
  const titleLink = document.createElement("a");
  titleLink.href = `/post/${post.id}`;
  titleLink.className = "post-title-link";
  const h3 = document.createElement("h3");
  h3.textContent = post.title;
  titleLink.appendChild(h3);

  // excerpt
  const p = document.createElement("p");
  p.textContent = post.content.substring(0, 120) + "...";

  // share button — data-id used to build the post-specific share URL
  const shareBtn = document.createElement("button");
  shareBtn.className = "share-linkedin-btn";
  shareBtn.dataset.id = post.id;
  shareBtn.innerHTML = `<i class="bi bi-linkedin"></i> Share to LinkedIn`;
  shareBtn.addEventListener("click", handleLinkedInShare);

  card.appendChild(form);
  card.appendChild(titleLink);
  card.appendChild(p);
  card.appendChild(shareBtn);

  blogBox.appendChild(card);
}



/* ===============================
   LINKEDIN SHARE WITH GOOGLE AUTH
=============================== */

async function handleLinkedInShare(e){

  // Build post-specific URL using data-id; fall back to current page
  const postId = e?.currentTarget?.dataset?.id;
  const postUrl = postId
    ? `${window.location.origin}/post/${postId}`
    : window.location.href;

  const shareUrl = encodeURIComponent(postUrl);
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`;

  const res = await fetch("/auth/status");
  const { loggedIn } = await res.json();

  if(!loggedIn){
    window.location.href = `/auth/google?returnTo=${encodeURIComponent(linkedInUrl)}`;
    return;
  }

  window.open(linkedInUrl, "_blank");
}
