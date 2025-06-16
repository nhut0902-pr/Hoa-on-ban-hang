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

    // --- TÍNH NĂNG XUẤT PDF (PHIÊN BẢN NÂNG CAO - TẠO BẢN SAO SẠCH) ---
    printPdfBtn.addEventListener('click', () => {
        printPdfBtn.disabled = true;
        printPdfBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang tạo...';

        const invoiceElement = document.getElementById('invoiceToPrint');
        
        // 1. Tạo một bản sao của hóa đơn để làm sạch mà không ảnh hưởng bản gốc
        const clone = invoiceElement.cloneNode(true);
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.top = '0px';
        clone.style.width = invoiceElement.offsetWidth + 'px'; // Giữ nguyên chiều rộng
        document.body.appendChild(clone);

        // 2. Xử lý các ô input: Thay thế chúng bằng giá trị text
        clone.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
            const parent = input.parentNode;
            let text;
            // Định dạng số cho đẹp
            if (input.classList.contains('product-price')) {
                 text = document.createTextNode(parseFloat(input.value || 0).toLocaleString('vi-VN'));
            } else {
                 text = document.createTextNode(input.value);
            }
            parent.replaceChild(text, input);
        });

        // 3. Xóa tất cả các phần tử không cần thiết trong bản sao
        clone.querySelectorAll('.btn, .product-image-upload, label[for^="file-"], .gemini-section').forEach(el => el.remove());
        
        // 4. Xóa cột "Xóa" khỏi bảng
        let deleteColumnIndex = -1;
        clone.querySelectorAll('thead th').forEach((th, index) => {
            if (th.innerText.trim().toLowerCase() === 'xóa') {
                deleteColumnIndex = index;
            }
        });
        if (deleteColumnIndex > -1) {
            clone.querySelectorAll('tr').forEach(row => {
                row.deleteCell(deleteColumnIndex);
            });
        }
        
        // 5. Chụp ảnh bản sao đã được làm sạch
        const { jsPDF } = window.jspdf;
        html2canvas(clone, { scale: 2, useCORS: true }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            let heightLeft = pdfHeight;
            let position = 0;
            const pageHeight = pdf.internal.pageSize.getHeight();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;
            while (heightLeft > 0) {
                position = heightLeft - pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pageHeight;
            }
            pdf.save(`hoa-don-${Date.now()}.pdf`);
        }).catch(err => {
            console.error("Lỗi khi tạo PDF:", err);
            alert("Không thể tạo file PDF.");
        }).finally(() => {
            // 6. Xóa bản sao khỏi DOM và khôi phục nút bấm
            document.body.removeChild(clone);
            printPdfBtn.disabled = false;
            printPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> In / Xuất PDF';
        });
    });


    // --- TÍNH NĂNG LƯU VÀO GOOGLE SHEETS ---
    const saveToGoogleSheets = async () => {
        const invoiceData = getInvoiceData();
        if (!invoiceData.customerName || invoiceData.products.length === 0) {
            alert('Vui lòng nhập tên khách hàng và ít nhất một sản phẩm để lưu.');
            return;
        }
        saveToSheetBtn.disabled = true;
        saveToSheetBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang lưu...';
        try {
            const response = await fetch('/.netlify/functions/save-to-sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invoiceData)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Lỗi không xác định từ server.');
            }
            alert('Lưu đơn hàng vào Google Sheets thành công!');
        } catch (error) {
            console.error('Lỗi khi lưu vào Google Sheets:', error);
            alert(`Đã xảy ra lỗi khi lưu đơn hàng: ${error.message}`);
        } finally {
            saveToSheetBtn.disabled = false;
            saveToSheetBtn.innerHTML = '<i class="fas fa-save"></i> Lưu vào Google Sheets';
        }
    };
    saveToSheetBtn.addEventListener('click', saveToGoogleSheets);

    // --- HÀM TIỆN ÍCH ---
    const getInvoiceData = () => {
        const customerName = document.getElementById('customerName').value.trim();
        const products = [];
        let total = 0;
        productTableBody.querySelectorAll('tr').forEach(row => {
            const name = row.querySelector('.product-name').value.trim();
            const quantity = parseInt(row.querySelector('.product-quantity').value) || 0;
            const price = parseFloat(row.querySelector('.product-price').value) || 0;
            if (name && quantity > 0) {
                products.push({ name, quantity, price });
                total += quantity * price;
            }
        });
        return {
            customerName: customerName,
            customerAddress: document.getElementById('customerAddress').value.trim(),
            products: products,
            totalAmount: total.toLocaleString('vi-VN') + ' VNĐ',
            createdAt: new Date().toLocaleString('vi-VN')
        };
    };

    // Thêm dòng sản phẩm đầu tiên khi tải trang
    addProductRow();
});
