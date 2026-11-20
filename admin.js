
const adminMessage = document.getElementById("adminMessage");
const adminProperties = document.getElementById("adminProperties");

let currentAdmin = null;


// 1. Check admin access
async function checkAdminAccess() {
    try {
        const { data: sessionData, error: sessionError } =
            await nyeriNestSupabase.auth.getSession();

        if (sessionError) throw sessionError;

        const user = sessionData.session?.user;

        if (!user) {
            adminMessage.textContent =
                "Please log in to access the admin dashboard.";
            window.location.href = "index.html";
            return false;
        }

        const { data: roleRecord, error: roleError } =
            await nyeriNestSupabase
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id)
                .maybeSingle();

        if (roleError) throw roleError;

        if (!roleRecord || roleRecord.role !== "admin") {
            adminMessage.textContent =
                "Access denied. Administrators only.";
            return false;
        }

        currentAdmin = user;
        return true;

    } catch (error) {
        console.error("Admin access error:", error);
        adminMessage.textContent =
            "Unable to verify administrator access.";
        return false;
    }
}


// 2. Fetch all property submissions
async function loadAdminProperties() {
    try {
        adminMessage.textContent = "Loading submissions...";

        const { data: properties, error } =
            await nyeriNestSupabase
                .from("properties")
                .select(`
                    id,
                    title,
                    property_type,
                    neighbourhood,
                    monthly_rent_kes,
                    bedrooms,
                    bathrooms,
                    status,
                    created_at,
                    owner_id
                `)
                .order("created_at", { ascending: false });

        if (error) throw error;

        updateAdminCounters(properties);
        displayAdminProperties(properties);

    } catch (error) {
        console.error("Loading properties failed:", error);
        adminMessage.textContent =
            "We couldn't load property submissions.";
    }
}


// 3. Update dashboard counters
function updateAdminCounters(properties) {
    document.getElementById("adminPending").textContent =
        properties.filter(p => p.status === "pending").length;

    document.getElementById("adminApproved").textContent =
        properties.filter(p => p.status === "approved").length;

    document.getElementById("adminRejected").textContent =
        properties.filter(p => p.status === "rejected").length;
}


// 4. Display property cards safely
function displayAdminProperties(properties) {
    adminProperties.replaceChildren();

    if (properties.length === 0) {
        adminMessage.textContent =
            "There are no property submissions yet.";
        return;
    }

    adminMessage.textContent =
        `${properties.length} property submission(s) found.`;

    properties.forEach(property => {
        const card = document.createElement("article");
        card.className = "my-property-card";

        const title = document.createElement("h3");
        title.textContent = property.title;

        const location = document.createElement("p");
        location.textContent =
            property.neighbourhood || "Location not provided";

        const type = document.createElement("p");
        type.textContent = property.property_type;

        const rent = document.createElement("p");
        rent.textContent =
            `KSh ${Number(property.monthly_rent_kes).toLocaleString()} / month`;

        const status = document.createElement("span");
        status.className =
            `property-status status-${property.status}`;
        status.textContent = property.status;

        card.append(title, location, type, rent, status);

        // Only pending submissions can be moderated
        if (property.status === "pending") {
            const actions = document.createElement("div");
            actions.className = "admin-actions";

            const approveButton = document.createElement("button");
            approveButton.type = "button";
            approveButton.className = "btn btn-green";
            approveButton.textContent = "Approve";

            approveButton.addEventListener("click", () => {
                moderateProperty(property.id, "approved");
            });

            const rejectButton = document.createElement("button");
            rejectButton.type = "button";
            rejectButton.className = "btn btn-dark";
            rejectButton.textContent = "Reject";

            rejectButton.addEventListener("click", () => {
                moderateProperty(property.id, "rejected");
            });

            actions.append(approveButton, rejectButton);
            card.appendChild(actions);
        }

        adminProperties.appendChild(card);
    });
}


// 5. Approve or reject a property
async function moderateProperty(propertyId, newStatus) {
    if (!currentAdmin) return;

    const confirmed = window.confirm(
        `Are you sure you want to ${newStatus} this property?`
    );

    if (!confirmed) return;

    try {
        adminMessage.textContent =
            "Updating property status...";

        const { error } = await nyeriNestSupabase.rpc(
            "moderate_property",
            {
                p_property_id: propertyId,
                p_new_status: newStatus
            }
        );

        if (error) throw error;

        adminMessage.textContent =
            `Property successfully ${newStatus}!`;

        await loadAdminProperties();

    } catch (error) {
        console.error("Moderation error:", error);

        adminMessage.textContent =
            "We couldn't update this property. Please try again.";
    }
}


// 6. Start the admin dashboard
async function initializeAdminDashboard() {
    const hasAccess = await checkAdminAccess();

    if (!hasAccess) return;

    await loadAdminProperties();
}

initializeAdminDashboard();
