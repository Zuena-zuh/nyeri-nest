

// =====================================
// APPROVED NYERINEST PROPERTIES
// =====================================

let properties = [];

const grid = document.getElementById("propertyGrid");
const resultCount = document.getElementById("resultCount");
const emptyState = document.getElementById("emptyState");
const locationFilter = document.getElementById("location");
const typeFilter = document.getElementById("type");
const minRent = document.getElementById("minRent");
const maxRent = document.getElementById("maxRent");
const sortFilter = document.getElementById("sort");
const propertyDialog = document.getElementById("propertyDialog");
const dialogContent = document.getElementById("dialogContent");
const contactDialog = document.getElementById("contactDialog");

const money = amount =>
    new Intl.NumberFormat("en-KE").format(amount);

// Safely display text entered by property advertisers
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// Convert database property types into homepage labels
function formatPropertyType(type) {
    const labels = {
        "bedsitter": "Bedsitter",
        "studio": "Studio",
        "1 bedroom": "1 Bedroom",
        "2 bedroom": "2 Bedroom",
        "3 bedroom": "3 Bedroom",
        "other": "Other"
    };

    return labels[type?.toLowerCase()] || type || "Not specified";
}

// Fetch approved listings from Supabase
async function loadApprovedProperties() {
    resultCount.textContent = "Loading available homes...";
    grid.hidden = true;
    emptyState.hidden = true;

    try {
        const { data, error } = await nyeriNestSupabase
            .from("properties")
            .select(`
                id,
                title,
                description,
                property_type,
                neighbourhood,
                location_details,
                monthly_rent_kes,
                bedrooms,
                bathrooms,
                created_at
            `)
            .eq("status", "approved")
            .order("created_at", { ascending: false });

        if (error) throw error;

        properties = (data || []).map(property => ({
            id: property.id,
            title: property.title,
            location: property.neighbourhood,
            type: formatPropertyType(property.property_type),
            rent: Number(property.monthly_rent_kes),
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            description: property.description || "No description provided yet.",
            locationDetails: property.location_details || "",
            added: new Date(property.created_at).getTime()
        }));

        if (properties.length === 0) {
            resultCount.textContent = "0 homes found";
            showEmptyState(
                "No approved homes just yet",
                "New properties will appear here once they have been reviewed."
            );
            return;
        }

        renderProperties();

    } catch (error) {
        console.error("Could not load approved properties:", error);

        resultCount.textContent = "Unable to load homes";
        showEmptyState(
            "We couldn't load the rentals",
            "Please check your connection and try again."
        );
    }
}

function showEmptyState(title, message) {
    emptyState.hidden = false;
    grid.hidden = true;

    emptyState.querySelector("h3").textContent = title;
    emptyState.querySelector("p").textContent = message;

    document.getElementById("clearFilters").hidden =
        properties.length === 0;
}


function getFilteredProperties() {
    const location = locationFilter.value;
    const type = typeFilter.value;
    const min = minRent.value === "" ? null : Number(minRent.value);
    const max = maxRent.value === "" ? null : Number(maxRent.value);

    let result = properties.filter(property => {
        if (location && property.location !== location) return false;
        if (type && property.type !== type) return false;
        if (min !== null && property.rent < min) return false;
        if (max !== null && property.rent > max) return false;

        return true;
    });

    if (sortFilter.value === "low") {
        result.sort((a, b) => a.rent - b.rent);
    } else if (sortFilter.value === "high") {
        result.sort((a, b) => b.rent - a.rent);
    } else {
        result.sort((a, b) => b.added - a.added);
    }

    return result;
}

function renderProperties() {
    const filtered = getFilteredProperties();

    resultCount.textContent =
        `${filtered.length} ${filtered.length === 1 ? "home" : "homes"} found`;

    if (filtered.length === 0) {
        showEmptyState(
            "No homes match those filters",
            "Try a different budget or neighbourhood."
        );
        return;
    }

    emptyState.hidden = true;
    grid.hidden = false;

    grid.innerHTML = filtered.map(property => `
        <article class="property-card">
            <div class="card-image property-image-placeholder">
                <span>⌂</span>
            </div>

            <div class="card-body">
                <div class="card-location">
                    ⌖ ${escapeHTML(property.location)}, Nyeri
                </div>

                <h3 class="card-title">
                    ${escapeHTML(property.title)}
                </h3>

                <div class="card-price">
                    KSh ${money(property.rent)}
                    <small>/ month</small>
                </div>

                <div class="card-features">
                    <span>${escapeHTML(property.type)}</span>
                    <span>${property.bedrooms ?? "—"} bedrooms</span>
                </div>

                <div class="card-footer">
                    <span class="unverified">Review approved</span>
                    <button class="details-btn" data-id="${escapeHTML(property.id)}">
                        View details →
                    </button>
                </div>
            </div>
        </article>
    `).join("");
}



function openPropertyDetails(id) {
    const property = properties.find(
        item => String(item.id) === String(id)
    );

    if (!property) return;

    dialogContent.innerHTML = `
        <div class="dialog-body">
            <span class="eyebrow">NYERINEST LISTING</span>

            <h2>${escapeHTML(property.title)}</h2>

            <p>⌖ ${escapeHTML(property.location)}, Nyeri</p>

            <div class="card-price">
                KSh ${money(property.rent)}
                <small>/ month</small>
            </div>

            <p><strong>Property type:</strong>
                ${escapeHTML(property.type)}
            </p>

            <p><strong>Bedrooms:</strong>
                ${property.bedrooms ?? "Not specified"}
            </p>

            <p><strong>Bathrooms:</strong>
                ${property.bathrooms ?? "Not specified"}
            </p>

            <p><strong>More specific location:</strong>
                ${escapeHTML(property.locationDetails || "Not provided")}
            </p>

            <p><strong>Description:</strong></p>
            <p>${escapeHTML(property.description)}</p>

            <p>
                This listing has been approved for display on NyeriNest.
                Please confirm the property's details and availability
                with the advertiser before making any arrangements.
            </p>
        </div>
    `;

    propertyDialog.showModal();
}


document.getElementById("searchBtn").addEventListener("click", renderProperties);
sortFilter.addEventListener("change", renderProperties);
locationFilter.addEventListener("change", renderProperties);
typeFilter.addEventListener("change", renderProperties);
minRent.addEventListener("input", renderProperties);
maxRent.addEventListener("input", renderProperties);

grid.addEventListener("click", event => {
  const button = event.target.closest("[data-id]");
  if (button) openPropertyDetails(button.dataset.id);
});

document.getElementById("clearFilters").addEventListener("click", () => {
  locationFilter.value = "";
  typeFilter.value = "";
  minRent.value = "";
  maxRent.value = "";
  sortFilter.value = "newest";
  renderProperties();
});

document.getElementById("listProperty").addEventListener("click", () => {
    window.location.href = "list-property.html";
});

document.getElementById("closeDialog").addEventListener("click", () => {
  propertyDialog.close();
});
document.getElementById("closeContact").addEventListener("click", () => {
  contactDialog.close();
});
document.getElementById("closeContact").addEventListener("click", () => {
  contactDialog.close();
});

propertyDialog.addEventListener("click", event => {
  if (event.target === propertyDialog) propertyDialog.close();
});


loadApprovedProperties();

// =====================================
// NYERINEST AUTHENTICATION
// =====================================

const authDialog = document.getElementById("authDialog");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");

const closeAuth = document.getElementById("closeAuth");

const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");

const showLogin = document.getElementById("showLogin");
const showSignup = document.getElementById("showSignup");

const createAccountForm = document.getElementById("createAccountForm");
const loginAccountForm = document.getElementById("loginAccountForm");

const authMessage = document.getElementById("authMessage");

function openAuth(mode) {
    authMessage.textContent = "";

    signupForm.hidden = mode !== "signup";
    loginForm.hidden = mode !== "login";

    authDialog.showModal();
}

loginBtn.addEventListener("click", () => openAuth("login"));

signupBtn.addEventListener("click", () => openAuth("signup"));

closeAuth.addEventListener("click", () => authDialog.close());

showLogin.addEventListener("click", () => openAuth("login"));

showSignup.addEventListener("click", () => openAuth("signup"));

// CREATE ACCOUNT
createAccountForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fullName = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;

    authMessage.textContent = "Creating your account...";

    const { data, error } = await nyeriNestSupabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName
            }
        }
    });

    if (error) {
        authMessage.textContent = error.message;
        return;
    }

    authMessage.textContent =
        "Account created! Check your email to confirm your account.";

    createAccountForm.reset();
});

// LOG IN
loginAccountForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    authMessage.textContent = "Logging in...";

    const { data, error } =
        await nyeriNestSupabase.auth.signInWithPassword({
            email,
            password
        });

    if (error) {
        authMessage.textContent = error.message;
        return;
    }

    authDialog.close();
    updateAuthUI(data.user);
    loginAccountForm.reset();
});

// LOG OUT
logoutBtn.addEventListener("click", async () => {
    const { error } = await nyeriNestSupabase.auth.signOut();

    if (error) {
        console.error("Logout failed:", error.message);
        return;
    }

    updateAuthUI(null);
});

// UPDATE NAVIGATION BASED ON USER ROLE
const dashboardLink = document.getElementById("dashboardLink");

async function updateAuthUI(user) {
    loginBtn.hidden = !!user;
    signupBtn.hidden = !!user;
    logoutBtn.hidden = !user;

    dashboardLink.hidden = true;

    if (!user) return;

    try {
        const { data: roleRecord, error } = await nyeriNestSupabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .maybeSingle();

        if (error) throw error;

        if (!roleRecord) return;

        const dashboardPages = {
            landlord: {
                url: "my-listings.html",
                label: "My Listings"
            },
            admin: {
                url: "admin.html",
                label: "Admin Dashboard"
            }
        };

        const destination = dashboardPages[roleRecord.role];

        if (destination) {
            dashboardLink.href = destination.url;
            dashboardLink.textContent = destination.label;
            dashboardLink.hidden = false;
        }

    } catch (error) {
        console.error("Navigation role check failed:", error);
    }
}

// CHECK EXISTING SESSION
async function checkAuthSession() {
    const { data, error } =
        await nyeriNestSupabase.auth.getSession();

    if (error) {
        console.error("Session check failed:", error.message);
        return;
    }

    updateAuthUI(data.session?.user ?? null);
}

checkAuthSession();

// LISTEN FOR AUTH CHANGES
nyeriNestSupabase.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {
        updateAuthUI(session?.user ?? null);
    }, 0);
});
