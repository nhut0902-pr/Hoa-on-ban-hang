document.addEventListener('DOMContentLoaded', () => {
    // --- KHAI BÁO CÁC BIẾN ---
    const addProductBtn = document.getElementById('addProductBtn');
    const productTableBody = document.querySelector('#productTable tbody');
    const totalAmountSpan = document.getElementById('totalAmount');
    const geminiBtn = document.getElementById('geminiBtn');
    const geminiResultDiv = document.getElementById('geminiResult');
    const printPdfBtn = document.getElementById('printPdfBtn');
    const saveToSheetBtn = document.getElementById('saveToSheetBtn');

    // !!! QUAN TRỌNG: Dán URL của Google Apps Script Web App của bạn vào đây.
    // !!! URL phải nằm trong cặp dấu nháy đơn ''.
    const GOOGLE_SHEET_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyz6KE6FWG18ntsE4MEkJmH21hZN-vAgC91myBmTALT33UQFRGAKMgr2wLsHykWHXApig/exec'; 

    let productRowCount = 0;

    // --- CÁC HÀM XỬ LÝ SẢN PHẨM ---

    const addProductRow = () => {
        productRowCount++;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" class="form-control product-name" placeholder="Tên sản phẩm"></td>
            <td class="text-center">
                <input type="file" class="product-image-upload" accept="image/*" id="file-${productRowCount}">
                <label for="file-${productRowCount}" class="btn btn-sm btn-outline-secondary no-print">Chọn ảnh</label>
                <img class="product-image-preview mt-2" src="" alt="">
            </td>
            <td class="text-center"><input type="number" class="form-control product-quantity" value="1" min="1"></td>
            <td class="text-end"><input type="number" class="form-control product-price" value="0" min="0"></td>
            <td class="text-end product-subtotal fw-bold">0 VNĐ</td>
            <td class="text-center"><button class="btn btn-danger btn-sm btn-delete no-print">Xóa</button></td>
        `;
        productTableBody.appendChild(row);
    };

    const updateTotals = () => {
        let total = 0;
        productTableBody.querySelectorAll('tr').forEach(row => {
            const quantity = parseFloat(row.querySelector('.product-quantity').value) || 0;
            const price = parseFloat(row.querySelector('.product-price').value) || 0;
            const subtotal = quantity * price;
            row.querySelector('.product-subtotal').textContent = `${subtotal.toLocaleString('vi-VN')} VNĐ`;
            total += subtotal;
        });
        totalAmountSpan.textContent = `${total.toLocaleString('vi-VN')} VNĐ`;
    };
    
    // --- CÁC HÀM XỬ LÝ SỰ KIỆN ---
    
    if (productTableBody) {
        productTableBody.addEventListener('input', e => {
            if (e.target.classList.contains('product-quantity') || e.target.classList.contains('product-price')) {
                updateTotals();
            }
        });

        productTableBody.addEventListener('click', e => {
            if (e.target.classList.contains('btn-delete')) {
                e.target.closest('tr').remove();
                updateTotals();
            }
        });

        productTableBody.addEventListener('change', e => {
            if (e.target.classList.contains('product-image-upload')) {
                const file = e.target.files[0];
                const preview = e.target.nextElementSibling.nextElementSibling;
                if (file) {
                    const reader = new FileReader();
                    reader.onload = event => { preview.src = event.target.result; };
                    reader.readAsDataURL(file);
                }
            }
        });
    }

    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            addProductRow();
            updateTotals();
        });
    }

    // --- TÍCH HỢP GEMINI AI ---
    if (geminiBtn) {
        geminiBtn.addEventListener('click', async () => {
            const invoiceData = getInvoiceData();
            if (!invoiceData.customerName || invoiceData.products.length === 0) {
                alert('Vui lòng nhập tên khách hàng và ít nhất một sản phẩm.');
                return;
            }

            let prompt = `Khách hàng tên là "${invoiceData.customerName}". Họ đã mua các sản phẩm sau:\n`;
            invoiceData.products.forEach(p => {
                prompt += `- ${p.name} (số lượng: ${p.quantity})\n`;
            });
            prompt += `\nDựa trên thông tin này, hãy:
1. Viết một lời cảm ơn ngắn gọn, thân thiện và chuyên nghiệp.
2. Đề xuất 2 sản phẩm liên quan mà khách hàng có thể thích, kèm lý do ngắn gọn.`;

            geminiResultDiv.innerHTML = '<p class="text-muted mb-0"><i class="fa-solid fa-spinner fa-spin"></i> AI đang suy nghĩ, vui lòng chờ...</p>';
            geminiBtn.disabled = true;

            try {
                const response = await fetch('/.netlify/functions/call-gemini', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt })
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: response.statusText }));
                    throw new Error(`Lỗi từ server: ${errorData.error || response.statusText}`);
                }
                const data = await response.json();
                geminiResultDiv.textContent = data.text;
            } catch (error) {
                console.error('Lỗi khi gọi Gemini:', error);
                geminiResultDiv.textContent = `Đã xảy ra lỗi khi kết nối với AI. Vui lòng kiểm tra lại cấu hình API Key trên Netlify.\nChi tiết: ${error.message}`;
            } finally {
                geminiBtn.disabled = false;
            }
        });
    }
    
    // --- TÍNH NĂNG XUẤT PDF ---
    if (printPdfBtn) {
        printPdfBtn.addEventListener('click', () => {
            const { jsPDF } = window.jspdf;
            const invoiceElement = document.getElementById('invoiceToPrint');
            
            html2canvas(invoiceElement, { 
                scale: 2,
                useCORS: true
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`hoa-don-${Date.now()}.pdf`);
            });
        });
    }

    // --- TÍNH NĂNG LƯU VÀO GOOGLE SHEETS ---
    if (saveToSheetBtn) {
        saveToSheetBtn.addEventListener('click', async () => {
            if (GOOGLE_SHEET_WEB_APP_URL === 'PASTE_YOUR_WEB_APP_URL_HERE' || !GOOGLE_SHEET_WEB_APP_URL) {
                alert('Lỗi Cấu Hình: Bạn chưa dán URL của Google Sheets Web App vào file script.js.');
                return;
            }
            
            const invoiceData = getInvoiceData();
            if (!invoiceData.customerName || invoiceData.products.length === 0) {
                alert('Vui lòng nhập tên khách hàng và ít nhất một sản phẩm để lưu.');
                return;
            }

            saveToSheetBtn.disabled = true;
            saveToSheetBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';

            try {
                fetch(GOOGLE_SHEET_WEB_APP_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    cache: 'no-cache',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(invoiceData),
                    redirect: 'follow',
                });
                
                setTimeout(() => {
                    alert('Yêu cầu lưu đơn hàng đã được gửi đi! Vui lòng kiểm tra file Google Sheets của bạn để xác nhận.');
                    saveToSheetBtn.disabled = false;
                    // *** DÒNG ĐƯỢC SỬA LỖI ĐÁNH MÁY ***
                    saveToSheetBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Lưu vào Google Sheets';
                }, 1500);
            } catch (error) {
                console.error('Lỗi khi gửi yêu cầu tới Google Sheets:', error);
                alert('Đã xảy ra lỗi khi gửi yêu cầu lưu đơn hàng. Vui lòng kiểm tra lại URL Web App.');
                saveToSheetBtn.disabled = false;
                saveToSheetBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Lưu vào Google Sheets';
            }
        });
    }

    // --- HÀM TIỆN ÍCH ---
    const getInvoiceData = () => {
        const customerName = document.getElementById('customerName').value.trim();
        const customerAddress = document.getElementById('customerAddress').value.trim();
        const products = [];
        let total = 0;

        productTableBody.querySelectorAll('tr').forEach(row => {
            const name = row.querySelector('.product-name').value.trim();
            const quantity = parseInt(row.querySelector('.product-quantity').value) || 0;
            const price = parseFloat(row.querySelector('.product-price').value) || 0;
            if(name && quantity > 0 && price >= 0) { // Chấp nhận cả sản phẩm miễn phí (giá 0)
                 products.push({ name, quantity, price });
                 total += quantity * price;
            }
        });
        
        return { 
            createdAt: new Date().toLocaleString('vi-VN'),
            customerName,
            customerAddress,
            products,
            totalAmount: total.toLocaleString('vi-VN') + ' VNĐ'
        };
    };

    // --- KHỞI TẠO BAN ĐẦU ---
    // Thêm dòng sản phẩm đầu tiên khi tải trang và tính toán lại
    addProductRow();
    updateTotals();
});
