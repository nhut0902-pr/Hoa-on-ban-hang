document.addEventListener('DOMContentLoaded', () => {
    // --- KHAI BÁO CÁC BIẾN ---
    const addProductBtn = document.getElementById('addProductBtn');
    const productTableBody = document.querySelector('#productTable tbody');
    const totalAmountSpan = document.getElementById('totalAmount');
    const geminiBtn = document.getElementById('geminiBtn');
    const geminiResultDiv = document.getElementById('geminiResult');
    const printPdfBtn = document.getElementById('printPdfBtn');
    const saveToSheetBtn = document.getElementById('saveToSheetBtn');

    // Dán URL của Google Apps Script của bạn vào đây
    const GOOGLE_SHEET_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyz6KE6FWG18ntsE4MEkJmH21hZN-vAgC91myBmTALT33UQFRGAKMgr2wLsHykWHXApig/exec'; 

    let productRowCount = 0;

    // --- CÁC HÀM XỬ LÝ SẢN PHẨM ---

    // Hàm thêm một dòng sản phẩm mới
    const addProductRow = () => {
        productRowCount++;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" class="form-control product-name" placeholder="Tên sản phẩm"></td>
            <td class="text-center">
                <input type="file" class="product-image-upload" accept="image/*" id="file-${productRowCount}">
                <label for="file-${productRowCount}" class="btn btn-sm btn-outline-secondary">Chọn ảnh</label>
                <img class="product-image-preview mt-2" src="" alt="">
            </td>
            <td class="text-center"><input type="number" class="form-control product-quantity" value="1" min="1"></td>
            <td class="text-end"><input type="number" class="form-control product-price" value="0" min="0"></td>
            <td class="text-end product-subtotal">0 VNĐ</td>
            <td class="text-center"><button class="btn btn-danger btn-delete">Xóa</button></td>
        `;
        productTableBody.appendChild(row);
    };

    // Hàm cập nhật tổng tiền
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

    // Sự kiện cho bảng sản phẩm (thêm, xóa, tính toán, tải ảnh)
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

    addProductBtn.addEventListener('click', addProductRow);

    // --- TÍCH HỢP GEMINI AI ---
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

        geminiResultDiv.innerHTML = '<p class="text-muted mb-0">AI đang suy nghĩ, vui lòng chờ...</p>';
        geminiBtn.disabled = true;

        try {
            const response = await fetch('/.netlify/functions/call-gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            if (!response.ok) throw new Error(`Lỗi từ server: ${response.statusText}`);
            const data = await response.json();
            geminiResultDiv.textContent = data.text;
        } catch (error) {
            console.error('Lỗi khi gọi Gemini:', error);
            geminiResultDiv.textContent = 'Đã xảy ra lỗi khi kết nối với AI.';
        } finally {
            geminiBtn.disabled = false;
        }
    });
    
    // --- TÍNH NĂNG XUẤT PDF ---
    printPdfBtn.addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const invoiceElement = document.getElementById('invoiceToPrint');
        
        // Sử dụng html2canvas để chụp ảnh phần tử hóa đơn
        html2canvas(invoiceElement, { scale: 2 }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`hoa-don-${Date.now()}.pdf`);
        });
    });

    // --- TÍNH NĂNG LƯU VÀO GOOGLE SHEETS ---
    const saveToGoogleSheets = async () => {
        if (GOOGLE_SHEET_WEB_APP_URL === 'PASTE_YOUR_WEB_APP_URL_HERE') {
            alert('Lỗi: Bạn chưa cấu hình URL của Google Sheets Web App trong file script.js');
            return;
        }
        
        const invoiceData = getInvoiceData();
        if (!invoiceData.customerName || invoiceData.products.length === 0) {
            alert('Vui lòng nhập tên khách hàng và ít nhất một sản phẩm để lưu.');
            return;
        }

        saveToSheetBtn.disabled = true;
        saveToSheetBtn.innerHTML = 'Đang lưu...';

        try {
            const response = await fetch(GOOGLE_SHEET_WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors', // Cần thiết khi gọi Apps Script từ client
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invoiceData)
            });
            alert('Lưu đơn hàng vào Google Sheets thành công!');
        } catch (error) {
            console.error('Lỗi khi lưu vào Google Sheets:', error);
            alert('Đã xảy ra lỗi khi lưu đơn hàng.');
        } finally {
            saveToSheetBtn.disabled = false;
            saveToSheetBtn.innerHTML = '<i class="fas fa-save"></i> Lưu vào Google Sheets';
        }
    };
    
    saveToSheetBtn.addEventListener('click', saveToGoogleSheets);

    // --- HÀM TIỆN ÍCH ---
    // Hàm lấy dữ liệu hóa đơn hiện tại
    const getInvoiceData = () => {
        const customerName = document.getElementById('customerName').value.trim();
        const products = [];
        let total = 0;

        productTableBody.querySelectorAll('tr').forEach(row => {
            const name = row.querySelector('.product-name').value.trim();
            const quantity = parseInt(row.querySelector('.product-quantity').value) || 0;
            const price = parseFloat(row.querySelector('.product-price').value) || 0;
            if(name && quantity > 0) {
                 products.push({ name, quantity, price });
                 total += quantity * price;
            }
        });
        
        return { 
            customerName,
            products,
            totalAmount: total.toLocaleString('vi-VN') + ' VNĐ',
            createdAt: new Date().toLocaleString('vi-VN')
        };
    };

    // Thêm dòng sản phẩm đầu tiên khi tải trang
    addProductRow();
});
