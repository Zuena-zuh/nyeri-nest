const dashboardMessage = document.getElementById("dashboardMessage");
const myProperties = document.getElementById("myProperties");

async function loadLandlordDashboard() {
    try {
        // 1. Check whether someone is logged in
        const { data: sessionData, error: sessionError } =
            await nyeriNestSupabase.auth.getSession();

        if (sessionError) throw sessionError;

        const user = sessionData.session?.user;

        if (!user) {
            dashboardMessage.textContent =
                "Please log in to access your dashboard.";

            window.location.href = "index.html";
            return;
        }

        // 2. Check the user's role
        const { data: roleRecord, error: roleError } =
            await nyeriNestSupabase
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id)
                .maybeSingle();

        if (roleError) throw roleError;

        if (!roleRecord || roleRecord.role !== "landlord") {
            dashboardMessage.textContent =
                "Access denied. This dashboard is for landlords only.";
            return;
        }

        // 3. Fetch only this landlord's properties
        const { data: listings, error: listingsError } =
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
                    created_at
                `)
                .eq("owner_id", user.id)
                .order("created_at", { ascending: false });

        if (listingsError) throw listingsError;

        // 4. Update dashboard counters
        document.getElementById("totalListings").textContent =
            listings.length;

        document.getElementById("pendingListings").textContent =
            listings.filter(property => property.status === "pending").length;

        document.getElementById("approvedListings").textContent =
            listings.filter(property => property.status === "approved").length;

        document.getElementById("rejectedListings").textContent =
            listings.filter(property => property.status === "rejected").length;

        // 5. Display the properties
        displayListings(listings);

    } catch (error) {
        console.error("Dashboard error:", error);

        dashboardMessage.textContent =
            "We couldn't load your dashboard. Please try again.";
    }
}


// Display property cards safely
function displayListings(listings) {
    myProperties.replaceChildren();

    if (listings.length === 0) {
        dashboardMessage.textContent =
            "You haven't listed any properties yet.";
        return;
    }

    dashboardMessage.textContent =
        `You have ${listings.length} listing(s).`;

    listings.forEach(property => {
        const card = document.createElement("article");
        card.className = "my-property-card";

        const title = document.createElement("h3");
        title.textContent = property.title;

        const location = document.createElement("p");
        location.textContent = property.neighbourhood || "Location not provided";

        const type = document.createElement("p");
        type.textContent = property.property_type;

        const rent = document.createElement("p");
        rent.textContent =
            `KSh ${Number(property.monthly_rent_kes).toLocaleString()} / month`;

        const status = document.createElement("span");
        status.className = `property-status status-${property.status}`;
        status.textContent = property.status;

        card.append(title, location, type, rent, status);
        myProperties.appendChild(card);
    });
}


// Start the dashboard
loadLandlordDashboard();

setInterval(() => {
    loadLandlordDashboard();
}, 10000);