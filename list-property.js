
// =====================================
// NYERINEST — PROPERTY LISTING PAGE
// WITH PRIVATE PROPERTY PHOTO UPLOADS
// =====================================

const listingForm = document.getElementById("propertySubmissionForm");
const listingMessage = document.getElementById("propertySubmissionMessage");
const submitButton = document.getElementById("submitPropertyBtn");
const photoInput = document.getElementById("propertyPhotos");
const photoCount = document.getElementById("photoCount");

const STORAGE_BUCKET = "property-photos";
const PHOTO_TABLE = "property_photos";
const MAX_PROPERTY_PHOTOS = 10;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB

// =====================================
// LIVE PROPERTY PHOTO COUNTER
// =====================================

photoInput.addEventListener("change", () => {

    const count = photoInput.files.length;

    photoCount.textContent =
        `${count} / ${MAX_PROPERTY_PHOTOS} photos selected`;

    if (count > MAX_PROPERTY_PHOTOS) {
        photoCount.style.color = "red";
    } else {
        photoCount.style.color = "";
    }
});

// Check login session
async function checkListingAccess() {
    const { data, error } =
        await nyeriNestSupabase.auth.getSession();

    if (error || !data.session) {
        alert("Please log in before listing a property.");
        window.location.href = "index.html";
        return false;
    }

    return true;
}

// Initialize listing page
let listingAccessGranted = false;

async function initializeListingPage() {
    submitButton.disabled = true;

    listingAccessGranted = await checkListingAccess();

    if (listingAccessGranted) {
        submitButton.disabled = false;
    }
}

initializeListingPage();

// Listen for authentication changes
nyeriNestSupabase.auth.onAuthStateChange((event, session) => {
    if (!session) {
        window.location.href = "index.html";
    }
});

// =====================================
// UPLOAD PROPERTY PHOTOS
// =====================================

async function uploadPropertyPhotos(files, user, property) {

    const uploadedPaths = [];

    if (!files.length) {
        return;
    }

    if (files.length > MAX_PROPERTY_PHOTOS) {
    throw new Error(
        `A property can have a maximum of ${MAX_PROPERTY_PHOTOS} photos.`
    );
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    // Validate selected images
    for (const file of files) {

    if (!allowedTypes.includes(file.type)) {
        throw new Error(
            "Please upload only JPG, PNG or WebP images."
        );
    }

    if (file.size > MAX_PHOTO_SIZE) {
        throw new Error(
            `${file.name} exceeds the 5 MB photo size limit.`
        );
    }
    }

    try {

        const photoRecords = [];

        for (let i = 0; i < files.length; i++) {

            const file = files[i];

            const extension = {
                "image/jpeg": "jpg",
                "image/png": "png",
                "image/webp": "webp"
            }[file.type];

            // Create landlord/property-specific storage path
            const filePath =
                `${user.id}/${property.id}/${Date.now()}-${i + 1}.${extension}`;

            // Upload image to private Supabase bucket
            const { error: uploadError } =
                await nyeriNestSupabase.storage
                    .from(STORAGE_BUCKET)
                    .upload(filePath, file, {
                        contentType: file.type,
                        upsert: false
                    });

            if (uploadError) {
                throw uploadError;
            }

            uploadedPaths.push(filePath);

            // Prepare image database record
            photoRecords.push({
                property_id: property.id,
                owner_id: user.id,
                uploaded_by: user.id,
                storage_path: filePath,
                alt_text: `${property.title} - property photo ${i + 1}`,
                is_primary: i === 0
            });
        }

        // Save all image records in the database
        const { error: databaseError } =
            await nyeriNestSupabase
                .from(PHOTO_TABLE)
                .insert(photoRecords);

        if (databaseError) {
            throw databaseError;
        }

    } catch (error) {

        // Clean up uploaded files if saving fails
        if (uploadedPaths.length) {

            const { error: cleanupError } =
                await nyeriNestSupabase.storage
                    .from(STORAGE_BUCKET)
                    .remove(uploadedPaths);

            if (cleanupError) {
                console.error(
                    "Photo cleanup failed:",
                    cleanupError.message
                );
            }
        }

        throw error;
    }
}

// =====================================
// PROPERTY SUBMISSION
// =====================================

listingForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    if (!listingAccessGranted) {
        listingMessage.textContent =
            "Please log in before submitting a property.";
        return;
    }

    const { data: sessionData, error: sessionError } =
        await nyeriNestSupabase.auth.getSession();

    if (sessionError || !sessionData.session) {
        listingMessage.textContent =
            "Your session has expired. Please log in again.";

        window.location.href = "index.html";
        return;
    }

    const user = sessionData.session.user;

    // Read selected property type
    const selectedType = document.querySelector(
        'input[name="propertyType"]:checked'
    );

    if (!selectedType) {
        listingMessage.textContent =
            "Please select a property type.";
        return;
    }

    // Collect property information
    const property = {
        owner_id: user.id,
        title: document.getElementById("propertyTitle").value.trim(),
        property_type: selectedType.value,
        neighbourhood: document.getElementById("propertyNeighbourhood").value.trim(),
        location_details: document.getElementById("propertyLocation").value.trim() || null,
        monthly_rent_kes: Number(document.getElementById("propertyRent").value),
        bedrooms: document.getElementById("propertyBedrooms").value === ""
            ? null
            : Number(document.getElementById("propertyBedrooms").value),
        bathrooms: document.getElementById("propertyBathrooms").value === ""
            ? null
            : Number(document.getElementById("propertyBathrooms").value),
        description: document.getElementById("propertyDescription").value.trim() || null,
        status: "pending"
    };

    const selectedPhotos = Array.from(
        photoInput.files || []
    );


// Validate photo types and sizes before saving property
const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
];

for (const file of selectedPhotos) {

    if (!allowedTypes.includes(file.type)) {
        listingMessage.textContent =
            "Please upload only JPG, PNG or WebP images.";
        return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
        listingMessage.textContent =
            `${file.name} exceeds the 5 MB photo size limit.`;
        return;
    }
}
    if (selectedPhotos.length > MAX_PROPERTY_PHOTOS) {
    listingMessage.textContent =
        `Please select no more than ${MAX_PROPERTY_PHOTOS} photos for one property.`;
    return;
    }

    // Prevent repeated submissions
    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    let propertyCreated = false;

    listingMessage.textContent =
        "Saving your property details...";

    try {

        // Insert property and retrieve its ID
        const { data: savedProperty, error: propertyError } =
            await nyeriNestSupabase
                .from("properties")
                .insert([property])
                .select("id")
                .single();

        if (propertyError) {
            throw propertyError;
        }

        propertyCreated = true;

        // Upload selected photos
        if (selectedPhotos.length) {

            listingMessage.textContent =
                "Uploading your property photos...";

            await uploadPropertyPhotos(
                selectedPhotos,
                user,
                {
                    id: savedProperty.id,
                    title: property.title
                }
            );
        }

        // Reset form after successful submission
        listingForm.reset();

        listingMessage.textContent =
            "Your property and photos have been submitted successfully and are awaiting review.";

        submitButton.textContent =
            "Submitted successfully ✓";

    } catch (error) {

        console.error(
            "Property submission failed:",
            error.message
        );

        if (propertyCreated) {

            listingMessage.textContent =
                "Your property was saved, but the photo upload failed. Please contact support before submitting it again.";

        } else {

            listingMessage.textContent =
                "We couldn't submit your property. Please try again.";
        }

        submitButton.disabled = false;
        submitButton.textContent = "Submit property →";
    }
});
