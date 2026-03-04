let selectedLat = null;
let selectedLng = null;
let editingId   = null;

// Sort blog posts by date descending
function sortBlogPosts() {
    const container = document.getElementById("blogContainer");
    const posts = Array.from(container.querySelectorAll(".blog-post"));
    posts.sort((a, b) => new Date(b.dataset.date) - new Date(a.dataset.date));
    posts.forEach(p => container.appendChild(p));
}

// Open form in ADD mode
function openLocationForm(lat, lng, locationName = '') {
    editingId = null;
    selectedLat = lat;
    selectedLng = lng;

    document.getElementById("modalTitle").textContent = "Add Travel Memory";
    document.getElementById("name").value        = locationName;
    document.getElementById("date").value        = '';
    document.getElementById("description").value = '';
    document.getElementById("whyWent").value     = '';
    document.getElementById("whySpecial").value  = '';
    document.getElementById("photoPreview").style.display = "none";
    document.getElementById("submitBtn").textContent = "Save Memory";
    document.getElementById("locationModal").style.display = "block";
}

// Open form in EDIT mode
function openEditModal(id) {
    editingId = id;
    const post = document.querySelector(`.blog-post[data-id="${id}"]`);

    document.getElementById("modalTitle").textContent    = "Edit Memory";
    document.getElementById("name").value        = post.dataset.name;
    document.getElementById("date").value        = post.dataset.date;
    document.getElementById("description").value = post.dataset.happened;
    document.getElementById("whyWent").value     = post.dataset.whywent;
    document.getElementById("whySpecial").value  = post.dataset.whyspecial;
    document.getElementById("submitBtn").textContent = "Save Changes";

    const existingPhoto = post.dataset.photo;
    if (existingPhoto) {
        document.getElementById("photoPreview").src = existingPhoto;
        document.getElementById("photoPreview").style.display = "block";
    } else {
        document.getElementById("photoPreview").style.display = "none";
    }

    document.getElementById("locationModal").style.display = "block";
}

// Delete a memory
async function deleteMemory(id) {
    if (!confirm('Delete this memory?')) return;
    await fetch(`/api/memories/${id}`, { method: 'DELETE' });
    document.querySelector(`.blog-post[data-id="${id}"]`).remove();
    updateStats();

    if (document.querySelectorAll('.blog-post').length === 0) {
        document.getElementById('emptyState').style.display = 'block';
    }
}

// Create blog post
function createBlogPost(location) {
    document.getElementById('emptyState').style.display = 'none';
    const container = document.getElementById("blogContainer");

    const existing = document.querySelector(`.blog-post[data-id="${location.id}"]`);
    if (existing) existing.remove();

    const post = document.createElement("div");
    post.className = "blog-post";
    post.dataset.id         = location.id;
    post.dataset.name       = location.location_name;
    post.dataset.date       = location.date_visited ? location.date_visited.split('T')[0] : '';
    post.dataset.happened   = location.what_happened;
    post.dataset.whywent    = location.why_did_you_go;
    post.dataset.whyspecial = location.why_was_it_special;
    post.dataset.photo      = location.photo_url || '';

    const photoHtml = location.photo_url
        ? `<img src="${location.photo_url}" alt="Memory photo" class="blog-photo">`
        : '';

    post.innerHTML = `
        ${photoHtml}
        <h3>${location.location_name}</h3>
        <small>${new Date(location.date_visited).toLocaleDateString('en-GB', { year:'numeric', month:'long', day:'numeric' })}</small>
        <p><strong>Activities:</strong> ${location.what_happened}</p>
        <p><strong>Why I went:</strong> ${location.why_did_you_go}</p>
        <p><strong>Why it was special:</strong> ${location.why_was_it_special}</p>
        <div class="post-actions">
            <button class="action-btn edit-btn" onclick="openEditModal(${location.id})">Edit</button>
            <button class="action-btn delete-btn" onclick="deleteMemory(${location.id})">Delete</button>
        </div>
    `;

    container.appendChild(post);
}

document.addEventListener('DOMContentLoaded', function () {

    document.querySelector(".close").onclick = function () {
        document.getElementById("locationModal").style.display = "none";
    };

    window.onclick = function (event) {
        const modal = document.getElementById("locationModal");
        if (event.target === modal) modal.style.display = "none";
    };

    // Location autocomplete
    let searchTimeout;
    const nameInput   = document.getElementById("name");
    const suggestions = document.getElementById("nameSuggestions");

    nameInput.addEventListener("input", function () {
        clearTimeout(searchTimeout);
        const query = this.value.trim();
        if (query.length < 3) { suggestions.style.display = "none"; return; }

        searchTimeout = setTimeout(async () => {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`);
            const results = await res.json();

            suggestions.innerHTML = '';
            if (!results.length) { suggestions.style.display = "none"; return; }

            results.forEach(place => {
                const li = document.createElement("li");
                li.textContent = place.display_name.split(',').slice(0, 3).join(',');
                li.style.cssText = "padding:10px 14px;cursor:pointer;font-size:0.85rem;border-bottom:1px solid #fde8f0;";
                li.addEventListener("mouseenter", () => li.style.background = "#fdf0f6");
                li.addEventListener("mouseleave", () => li.style.background = "white");
                li.addEventListener("click", () => {
                    nameInput.value = place.display_name.split(',').slice(0, 2).join(',').trim();
                    if (!editingId) {
                        selectedLat = parseFloat(place.lat);
                        selectedLng = parseFloat(place.lon);
                    }
                    suggestions.style.display = "none";
                });
                suggestions.appendChild(li);
            });
            suggestions.style.display = "block";
        }, 300);
    });

    document.addEventListener("click", (e) => {
        if (!nameInput.contains(e.target)) suggestions.style.display = "none";
    });

    // Form submit — handles both add and edit
    document.getElementById("locationForm").addEventListener("submit", async function (e) {
        e.preventDefault();

        const btn = document.getElementById("submitBtn");
        const original = btn.textContent;
        btn.textContent = "Saving...";
        btn.disabled = true;

        const formData = new FormData();
        formData.append("location_name",      document.getElementById("name").value);
        formData.append("date_visited",       document.getElementById("date").value);
        formData.append("what_happened",      document.getElementById("description").value);
        formData.append("why_did_you_go",     document.getElementById("whyWent").value);
        formData.append("why_was_it_special", document.getElementById("whySpecial").value);

        const photoFile = document.getElementById("photo").files[0];
        if (photoFile) formData.append("photo", photoFile);

        if (editingId) {
            const res = await fetch(`/api/memories/${editingId}`, { method: 'PUT', body: formData });
            const updated = await res.json();
            createBlogPost(updated);
            sortBlogPosts();
        } else {
            formData.append("lat", selectedLat);
            formData.append("lng", selectedLng);
            await addLocation(formData);
        }

        btn.textContent = original;
        btn.disabled = false;

        document.getElementById("locationModal").style.display = "none";
        this.reset();
        document.getElementById("photoPreview").style.display = "none";
    });

    document.getElementById("photo").addEventListener("change", function () {
        const preview = document.getElementById("photoPreview");
        const file = this.files[0];
        if (file) {
            preview.src = URL.createObjectURL(file);
            preview.style.display = "block";
        } else {
            preview.style.display = "none";
        }
    });

});