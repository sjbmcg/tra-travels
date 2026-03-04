let selectedLat = null;
let selectedLng = null;

// Open form — called from map.js
function openLocationForm(lat, lng, locationName = '') {
    selectedLat = lat;
    selectedLng = lng;
    document.getElementById("name").value = locationName;
    document.getElementById("locationModal").style.display = "block";
}

// Create blog post
function createBlogPost(location) {
    const container = document.getElementById("blogContainer");
    const post = document.createElement("div");
    post.className = "blog-post";

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
        formData.append("lat", selectedLat);
        formData.append("lng", selectedLng);

        const photoFile = document.getElementById("photo").files[0];
        if (photoFile) formData.append("photo", photoFile);

        await addLocation(formData);

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