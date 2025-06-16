// --- File script.js phiên bản hoàn chỉnh nhất ---
document.addEventListener('DOMContentLoaded', () => {
    // --- KHAI BÁO CÁC BIẾN ---
    const addProductBtn = document.getElementById('addProductBtn');
    const productTableBody = document.querySelector('#productTable tbody');
    const totalAmountSpan = document.getElementById('totalAmount');
    const geminiBtn = document.getElementById('geminiBtn');
    const geminiResultDiv = document.getElementById('geminiResult');
    const printPdfBtn = document.getElementById('printPdfBtn');
    const saveToSheetBtn = document.getElementById('saveToSheetBtn');
    let productRowCount = 0;

    // --- CÁC HÀM XỬ LÝ SẢN PHẨM (Không đổi) ---
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

    // --- CÁC HÀM XỬ LÝ SỰ KIỆN (Không đổi) ---
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

    // --- TÍCH HỢP GEMINI AI (Không đổi) ---
    geminiBtn.addEventListener('click', async () => { /* ... code không đổi ... */ });

    // --- LƯU VÀO GOOGLE SHEETS (Không đổi) ---
    const saveToGoogleSheets = async () => { /* ... code không đổi ... */ };
    saveToSheetBtn.addEventListener('click', saveToGoogleSheets);

    // --- TÍNH NĂNG XUẤT PDF (NÂNG CẤP LỚN) ---
    printPdfBtn.addEventListener('click', () => {
        printPdfBtn.disabled = true;
        printPdfBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang tạo...';

        // 1. Lấy toàn bộ dữ liệu hóa đơn
        const invoiceData = getInvoiceData();
        const invoiceNumber = `HD${Date.now()}`;

        // 2. Tạo HTML cho file PDF một cách linh động
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

        // 3. Render HTML ẩn này để html2canvas chụp ảnh
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.innerHTML = pdfHtml;
        document.body.appendChild(tempContainer);

        // 4. Chụp ảnh và tạo PDF
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

    // --- HÀM TIỆN ÍCH (CẬP NHẬT ĐỂ LẤY CẢ ẢNH) ---
    const getInvoiceData = () => {
        const products = [];
        let total = 0;
        productTableBody.querySelectorAll('tr').forEach(row => {
            const name = row.querySelector('.product-name').value.trim();
            const quantity = parseInt(row.querySelector('.product-quantity').value) || 0;
            const price = parseFloat(row.querySelector('.product-price').value) || 0;
            const imageSrc = row.querySelector('.product-image-preview').src; // Lấy source của ảnh
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
