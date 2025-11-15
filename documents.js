document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('doc-table-body');

    // Simple API call helper
    const callApi = async (action, data = {}) => {
        try {
            const response = await fetch('/.netlify/functions/api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, data }),
            });
            if (!response.ok) throw new Error('Network response was not ok');
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'API request failed');
            return result.data;
        } catch (error) {
            console.error('API Error:', error);
            tableBody.innerHTML = `<tr><td colspan="5">Error loading data.</td></tr>`;
        }
    };

    // Main function to load and render documents
    const loadDocuments = async () => {
        const documents = await callApi('getDocumentData');
        
        if (!documents || documents.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5">No documents found.</td></tr>`;
            return;
        }

        tableBody.innerHTML = ''; // Clear loading row
        
        documents.forEach(doc => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${doc.docType}</strong><br><small>${doc.fullName}</small></td>
                <td>${doc.docNumber || '-'}</td>
                <td>${doc.issued || '-'}</td>
                <td>${doc.expiry || '-'}</td>
                <td>
                    ${doc.link.startsWith('http') ? 
                        `<a href="${doc.link}" target="_blank">Open</a>` : 
                        (doc.link || '-')}
                </td>
            `;
            tableBody.appendChild(tr);
        });
    };

    loadDocuments();
});