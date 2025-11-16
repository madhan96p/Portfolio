// --- documents.js ---
// Manages the Documents page (documents.html)

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('doc-table-body');
    
    // --- NEW MODAL ELEMENTS ---
    const modal = document.getElementById('doc-modal');
    const modalViewer = document.getElementById('doc-viewer');
    const closeBtn = document.getElementById('close-doc-modal');

    if (!modal || !modalViewer || !closeBtn) {
        console.error('Modal elements not found!');
    }

    // --- NEW: Function to show the modal ---
    const showModal = (content) => {
        modalViewer.innerHTML = content;
        modal.classList.add('visible');
    };

    // --- NEW: Function to hide the modal ---
    const hideModal = () => {
        modalViewer.innerHTML = ''; // Clear content
        modal.classList.remove('visible');
    };

    // --- NEW: Function to handle link clicks ---
    const handleLinkClick = (e) => {
        e.preventDefault(); // Stop browser from opening new tab
        const link = e.currentTarget.href;

        // Check if it's a PDF link
        if (link.toLowerCase().endsWith('.pdf') || e.currentTarget.dataset.type === 'pdf') {
            // It's a PDF, embed it in an iframe
            showModal(`<iframe src="${link}" title="PDF Viewer"></iframe>`);
        } 
        // Check if it's an image link
        else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(link)) {
            // It's an image, use an img tag
            showModal(`<img src="${link}" alt="Document Scan">`);
        } 
        // --- IMPORTANT: Google Drive Fix ---
        else if (link.includes('drive.google.com/file')) {
            // It's a G-Drive link, we must convert it
            // from '.../view' to '.../preview' to embed
            const previewLink = link.replace('/view', '/preview');
            showModal(`<iframe src="${previewLink}" title="Google Drive Viewer"></iframe>`);
        }
        else {
            // Unknown link, just open it in a new tab
            window.open(link, '_blank');
        }
    };

    // Main function to load and render documents
    const loadDocuments = async () => {
        const result = await callApi('getDocumentData');
        
        if (!result || !result.data || result.data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6">No documents found.</td></tr>`;
            return;
        }

        const documents = result.data;
        tableBody.innerHTML = ''; // Clear loading row
        
        documents.forEach(doc => {
            const tr = document.createElement('tr');
            
            // --- MODIFIED LINK RENDERING ---
            const driveLink = doc.link && doc.link.startsWith('http') 
                ? `<a href="${doc.link}" class="doc-link" data-type="drive">Open Link</a>` 
                : (doc.link || '-');
            
            const pdfLink = doc.pdf && doc.pdf.startsWith('http')
                ? `<a href="${doc.pdf}" class="doc-link" data-type="pdf">Open PDF</a>`
                : (doc.pdf || '-');
            // --- END OF MODIFICATION ---

            tr.innerHTML = `
                <td><strong>${doc.docType}</strong><br><small>${doc.fullName}</small></td>
                <td>${doc.docNumber || '-'}</td>
                <td>${doc.issued || '-'}</td>
                <td ${doc.expiry ? '' : 'style="color: var(--text-light);"'}>${doc.expiry || 'N/A'}</td>
                <td>${driveLink}</td>
                <td>${pdfLink}</td>
            `;
            tableBody.appendChild(tr);
        });

        // --- NEW: Add event listeners to all new links ---
        document.querySelectorAll('.doc-link').forEach(link => {
            link.addEventListener('click', handleLinkClick);
        });
    };

    // --- NEW: Add listener for modal close button ---
    closeBtn.addEventListener('click', hideModal);

    // Initial load
    loadDocuments();
});