// PHIÊN BẢN CUỐI CÙNG - GỌI GOOGLE SHEETS TRỰC TIẾP
document.addEventListener('DOMContentLoaded', () => {
    // !!! QUAN TRỌNG: Dán URL của Google Apps Script Web App của bạn vào đây.
    // !!! URL phải nằm trong cặp dấu nháy đơn ''.
    const GOOGLE_SHEET_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzRnrSw1fwV3KvgBG2HZu5qFD6XXvUR---iK5AQuxv71DF8tUcSIetWFyOaMoMAOXL0/exec';

    // --- KHAI BÁO CÁC BIẾN ---
    const addProductBtn = document.getElementById('addProductBtn');
    const productTableBody = document.querySelector('#productTable tbody');
    const totalAmountSpan = document.getElementById('totalAmount');
    const geminiBtn = document.getElementById('geminiBtn');
    const geminiResultDiv = document.getElementById('geminiResult');
    const printPdfBtn = document.getElementById('printPdfBtn');
    const saveToSheetBtn = document.getElementById('saveToSheetBtn');
    let productRowCount = 0;

    // --- CÁC HÀM XỬ LÝ SẢN PHẨM ---
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
    productTableBody.addEventListener('input', e => {
        if (e.target.classList.contains('product-quantity') || e.target.classList.contains('product-price')) { updateTotals(); }
    });
    productTableBody.addEventListener('click', e => {
        if (e.target.classList.contains('btn-delete')) { e.target.closest('tr').remove(); updateTotals(); }
    });
    productTableBody.addEventListener('change', e => {
        if (e.target.classList.contains('product-image-upload')) {
            const file = e.target.files[0];
            const preview = e.target.nextElementSibling.nextElementSibling;
            if (file) { const reader = new FileReader(); reader.onload = event => { preview.src = event.target.result; }; reader.readAsDataURL(file); }
        }
    });
    addProductBtn.addEventListener('click', addProductRow);

    // --- TÍCH HỢP GEMINI AI (Vẫn dùng Serverless để bảo mật API Key) ---
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
            const responseText = await response.text();
            if (!responseText) throw new Error('Server không phản hồi (có thể đã timeout).');
            const data = JSON.parse(responseText);
            if (!response.ok) throw new Error(data.error || 'Lỗi không xác định từ server.');
            geminiResultDiv.textContent = data.text;
        } catch (error) {
            console.error('Lỗi khi gọi Gemini:', error);
            geminiResultDiv.textContent = `Đã xảy ra lỗi khi kết nối với AI: ${error.message}`;
        } finally {
            geminiBtn.disabled = false;
        }
    });

    // --- LƯU VÀO GOOGLE SHEETS (Gọi trực tiếp, không qua Serverless) ---
    const saveToGoogleSheets = (event) => {
        event.preventDefault(); 
        if (!GOOGLE_SHEET_WEB_APP_URL || GOOGLE_SHEET_WEB_APP_URL === 'PASTE_YOUR_GOOGLE_SHEET_WEB_APP_URL_HERE') {
            alert('Lỗi: Bạn chưa cấu hình URL của Google Sheets trong file script.js');
            return;
        }
        const invoiceData = getInvoiceData();
        if (!invoiceData.customerName || invoiceData.products.length === 0) {
            alert('Vui lòng nhập tên khách hàng và ít nhất một sản phẩm để lưu.');
            return;
        }
        saveToSheetBtn.disabled = true;
        saveToSheetBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang lưu...';
        
        fetch(GOOGLE_SHEET_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // Quan trọng: Lách lỗi CORS
            body: JSON.stringify(invoiceData) 
        }).then(() => {
            alert('Đã gửi yêu cầu lưu đơn hàng! Vui lòng kiểm tra Google Sheets để xác nhận.');
        }).catch(error => {
            console.error('Lỗi mạng khi gửi yêu cầu:', error);
            alert('Đã xảy ra lỗi mạng. Vui lòng thử lại.');
        }).finally(() => {
            saveToSheetBtn.disabled = false;
            saveToSheetBtn.innerHTML = '<i class="fas fa-save"></i> Lưu vào Google Sheets';
        });
    };
    saveToSheetBtn.addEventListener('click', saveToGoogleSheets);

    // --- TÍNH NĂNG XUẤT PDF ---
    printPdfBtn.addEventListener('click', () => {
        printPdfBtn.disabled = true;
        printPdfBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang tạo...';

        const invoiceData = getInvoiceData();
        const invoiceNumber = `HD${Date.now()}`;
        let productRowsHtml = '';
        invoiceData.products.forEach((p, index) => {
            productRowsHtml += `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>${p.name}</td>
                    <td class="text-center"><img src="${p.imageSrc}" class="product-image-pdf"></td>
                    <td class="text-center">${p.quantity}</td>
                    <td class="text-end">${p.price.toLocaleString('vi-VN')}</td>
                    <td class="text-end">${(p.quantity * p.price).toLocaleString('vi-VN')}</td>
                </tr>
            `;
        });
        
        const shopInfo = document.getElementById('shop-info').innerHTML;
        const pdfHtml = `
            <div id="pdf-container">
                ${shopInfo}
                <h2>HÓA ĐƠN BÁN HÀNG</h2>
                <div class="invoice-meta">
                    <strong>Số hóa đơn:</strong> ${invoiceNumber}<br>
                    <strong>Ngày:</strong> ${invoiceData.createdAt}
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Tên sản phẩm</th>
                            <th class="text-center">Hình ảnh</th>
                            <th class="text-center">Số lượng</th>
                            <th class="text-end">Đơn giá (VNĐ)</th>
                            <th class="text-end">Thành tiền (VNĐ)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productRowsHtml}
                    </tbody>
                </table>
                <h3 class="text-end" style="margin-top: 20px;">Tổng cộng: ${invoiceData.totalAmount}</h3>
                <div class="footer-notes">
                    <p>Cảm ơn quý khách đã mua hàng!</p>
                    <p>Hẹn gặp lại quý khách!</p>
                </div>
            </div>
        `;

        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.innerHTML = pdfHtml;
        document.body.appendChild(tempContainer);

        const { jsPDF } = window.jspdf;
        const pdfTarget = tempContainer.querySelector('#pdf-container');
        html2canvas(pdfTarget, { scale: 2, useCORS: true }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`hoa-don-${invoiceNumber}.pdf`);
        }).catch(err => {
            console.error("Lỗi khi tạo PDF:", err);
            alert("Không thể tạo file PDF.");
        }).finally(() => {
            document.body.removeChild(tempContainer);
            printPdfBtn.disabled = false;
            printPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> In / Xuất PDF';
        });
    });

    // --- HÀM TIỆN ÍCH (LẤY DỮ LIỆU) ---
    const getInvoiceData = () => {
        const products = [];
        let total = 0;
        productTableBody.querySelectorAll('tr').forEach(row => {
            const name = row.querySelector('.product-name').value.trim();
            const quantity = parseInt(row.querySelector('.product-quantity').value) || 0;
            const price = parseFloat(row.querySelector('.product-price').value) || 0;
            const imageSrc = row.querySelector('.product-image-preview').src;
            if (name && quantity > 0) {
                products.push({ name, quantity, price, imageSrc });
                total += quantity * price;
            }
        });
        return {
            customerName: document.getElementById('customerName').value.trim(),
            customerAddress: document.getElementById('customerAddress').value.trim(),
            products: products,
            totalAmount: total.toLocaleString('vi-VN') + ' VNĐ',
            createdAt: new Date().toLocaleString('vi-VN')
        };
    };

    // Thêm dòng sản phẩm đầu tiên khi tải trang
    addProductRow();
});
