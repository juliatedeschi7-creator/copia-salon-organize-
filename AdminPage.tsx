// Update the handleApprove and handleReject functions

const handleApprove = (id) => {
    setApprovalStatus(id, true); // Change status to is_approved
};

const handleReject = (id) => {
    setApprovalStatus(id, false); // Change status to is_approved
};

// Update the ProfileRow interface 
interface ProfileRow {
    is_approved: boolean; // Use is_approved boolean
    name: string; // Use name instead of full_name
}

// Refactor filters for pending and approved
const filteredPending = profiles.filter(profile => !profile.is_approved);
const filteredApproved = profiles.filter(profile => profile.is_approved);
