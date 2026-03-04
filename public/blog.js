let selectedLat = null;
let selectedLng = null;
let editingId   = null;

// Open form in ADD mode
function openLocationForm(lat, lng, locationName = '') {
    editingId = null;
    selectedLat = lat;
    selectedLng = lng;

    document.getElementById("modalTitle").textContent = "Add Travel Memory";
    document.getElementById("name").value = locationName;
    document.getElementById("date").value = '';
    document.getElementById("description").value = '';
    document.getElementById("whyWent").value = '';
    document.getElementById("whySpecial").value = '';
    document.getElementById("photoPreview").style.display = "none";
    document.getElementById("submitBtn").textContent = "Save Memory";
    document.getElementById("locationModal").style.display = "block";
}

// Open form in EDIT mode
function openEditModal(id) {
    editingId = id;
    const post = document.querySelector(`.blog-post[data-id="${id}"]`);

    document.getElementById("modalTitle").textContent = "Edit Memory";
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
}

// Create blog post
function createBlogPost(location) {
    const container = document.getElementById("blogContainer");

    // Remove existing post if updating
    const existing = document.querySelector(`.blog-post[data-id="${location.id}"]`);
    if (existing) existing.remove();

    const post = document.createElement("div");
    post.className = "blog-post";
    post.dataset.id        = location.id;
    post.dataset.name      = location.location_name;
    post.dataset.date      = location.date_visited ? location.date_visited.split('T')[0] : '';
    post.dataset.happened  = location.what_happened;
    post.dataset.whywent   = location.why_did_you_go;
    post.dataset.whyspecial = location.why_was_it_special;
    post.dataset.photo     = location.photo_url || '';

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

    document.getElementById("locationForm").addEventListener("submit", async function (e) {
        e.preventDefault();

        const formData = new FormData();
        formData.append("location_name",      document.getElementById("name").value);
        formData.append("date_visited",       document.getElementById("date").value);
        formData.append("what_happened",      document.getElementById("description").value);
        formData.append("why_did_you_go",     document.getElementById("whyWent").value);
        formData.append("why_was_it_special", document.getElementById("whySpecial").value);

        const photoFile = document.getElementById("photo").files[0];
        if (photoFile) formData.append("photo", photoFile);

        if (editingId) {
            // EDIT mode
            const res = await fetch(`/api/memories/${editingId}`, { method: 'PUT', body: formData });
            const updated = await res.json();
            createBlogPost(updated);
        } else {
            // ADD mode
            formData.append("lat", selectedLat);
            formData.append("lng", selectedLng);
            await addLocation(formData);
        }

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