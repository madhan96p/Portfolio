// --- documents.js ---
// Manages the Documents page (documents.html)

document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('doc-table-body');

    // Main function to load and render documents
    const loadDocuments = async () => {
        // The global `callApi` function is from common.js
        // It now handles the loader and error alerts automatically.
        const result = await callApi('getDocumentData');
        
        if (!result || !result.data || result.data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6">No documents found.</td></tr>`;
            return;
        }

        const documents = result.data;
        tableBody.innerHTML = ''; // Clear loading row
        
        documents.forEach(doc => {
            const tr = document.createElement('tr');
            
            const driveLink = doc.link && doc.link.startsWith('http') 
                ? `<a href="${doc.link}" target="_blank">Open Link</a>` 
                : (doc.link || '-');
            
            const pdfLink = doc.pdf && doc.pdf.startsWith('http')
                ? `<a href="${doc.pdf}" target="_blank">Open PDF</a>`
                : (doc.pdf || '-');

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
    };

    // Initial load
    loadDocuments();
});