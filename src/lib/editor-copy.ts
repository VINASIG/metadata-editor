export const editorCopy = {
  vi: {
    title: 'Chỉnh sửa metadata ảnh',
    description:
      'Thêm, sửa hoặc xóa thông tin XMP trong JPEG, PNG và WebP ngay trong trình duyệt. Giữ nguyên dữ liệu ảnh đã nén.',
    types: 'JPEG, PNG và WebP. Tối đa 100 MiB mỗi ảnh.',
    empty: 'Chọn ảnh để xem metadata và bắt đầu chỉnh sửa.',
    editTitle: 'Thông tin muốn chỉnh sửa',
    editHint:
      'Các trường dưới đây thuộc XMP. Trường khác được giữ nguyên. Nhập giá trị sẽ chọn Đặt mới. Xóa một trường sẽ xóa toàn bộ thuộc tính đó, gồm các bản ngôn ngữ khác.',
    exifHint:
      'EXIF và IPTC được giữ mặc định. Sửa tác giả hoặc ngày trong XMP không đồng thời sửa thông tin đó trong EXIF hay IPTC. Xem các nhóm metadata để đối chiếu.',
    actions: { keep: 'Giữ nguyên', set: 'Đặt mới', remove: 'Xóa trường' },
    labels: {
      title: 'Tiêu đề',
      description: 'Mô tả',
      creator: 'Tác giả',
      rights: 'Thông tin bản quyền',
      subject: 'Từ khóa',
      CreateDate: 'Ngày tạo',
      ModifyDate: 'Ngày sửa nội dung',
      MetadataDate: 'Ngày sửa metadata',
      CreatorTool: 'Phần mềm tạo',
      Rating: 'Đánh giá',
      Label: 'Nhãn',
    },
    listHint: 'Mỗi tác giả hoặc từ khóa trên một dòng.',
    dateHint:
      'Nhập ngày theo dạng 2026-10-06 hoặc thời gian 2026-10-06T14:30:00+07:00. Không tự thêm thời gian hiện tại.',
    ratingHint: 'Nhập từ 0 đến 5. Giá trị -1 biểu thị ảnh bị loại.',
    resetEdits: 'Khôi phục giá trị gốc',
    removeAll: 'Xóa toàn bộ XMP',
    removeAllHint:
      'Bỏ cả các trường XMP chưa có trong biểu mẫu. Các trường chỉnh sửa sẽ không được ghi.',
    removeOther: 'Xóa metadata ngoài XMP',
    removeOtherHint:
      'Bỏ EXIF riêng tư, IPTC, văn bản, ảnh thu nhỏ và các khối tùy chọn được hỗ trợ. Giữ thông tin cần cho hướng hiển thị, màu sắc, độ trong suốt và chuyển động.',
    credentials:
      'Ảnh có bản khai báo nguồn gốc C2PA. Công cụ sẽ bỏ bản khai báo này khi metadata thay đổi. Công cụ không ký lại hoặc chứng nhận nguồn gốc ảnh.',
    process: 'Tạo ảnh với metadata mới',
    xmlProcess: 'Tạo ảnh từ XML đã sửa',
    advanced: 'Chỉnh sửa XMP dạng XML',
    advancedHint:
      'Dành cho các thuộc tính chưa có trong biểu mẫu. Nút bên dưới chỉ áp dụng XML và lựa chọn xóa metadata ngoài XMP. Không áp dụng thay đổi trong biểu mẫu. XML không được thực thi và các đường dẫn bên trong không được truy cập.',
    xmlLabel: 'Nội dung XMP',
    xmlHint:
      'Tối đa 1 MiB. Không chấp nhận khai báo DTD, thực thể XML hoặc thay đổi hướng hiển thị và hồ sơ màu.',
    downloadXmp: 'Tải XMP đang nhập',
    original: 'Metadata ảnh gốc',
    processed: 'Metadata ảnh mới',
    ready: 'Đã đọc ảnh. Mọi trường đang giữ nguyên cho đến khi bạn chỉnh sửa.',
    working: 'Đang ghi metadata và kiểm tra dữ liệu ảnh.',
    done: 'Đã tạo bản sao. Dữ liệu ảnh nén giống nhau từng byte.',
    outputTitle: 'Ảnh có metadata mới',
    unchanged: 'Không có thay đổi. Bản sao giữ nguyên từng byte file gốc.',
    changedSize: 'Chênh lệch dung lượng',
    remaining:
      'Những thông tin ngoài phạm vi chỉnh sửa vẫn có thể tồn tại trong ảnh. Dùng công cụ xóa metadata nếu mục tiêu là giảm thông tin riêng tư.',
    coverage:
      'Chỉnh sửa 11 thuộc tính XMP phổ biến hoặc một gói XML chuẩn. EXIF, IPTC và metadata khác được đọc để đối chiếu. Không sửa trực tiếp các thẻ nhị phân của nhà sản xuất.',
    faqScope: 'Có thể sửa những thông tin nào?',
    faqScopeText:
      'Biểu mẫu hỗ trợ tiêu đề, mô tả, danh sách tác giả, bản quyền, từ khóa, ba trường ngày, phần mềm tạo, đánh giá và nhãn của XMP. Trình sửa XML cho phép sửa thêm các thuộc tính XMP. Giữ nguyên không ghi đè trường đó. Đặt mới thay toàn bộ giá trị của thuộc tính. Xóa trường chỉ xóa thuộc tính XMP tương ứng.',
    faqQuality: 'Chất lượng ảnh có thay đổi không?',
    faqQualityText:
      'Công cụ không giải mã rồi nén lại ảnh. Dữ liệu ảnh nén, kích thước, màu sắc, hướng hiển thị, độ trong suốt và các khung chuyển động được giữ. Metadata được đóng gói lại nên dung lượng có thể tăng hoặc giảm theo giá trị bạn nhập.',
    faqPrivacy: 'Chỉnh sửa có xóa hết thông tin riêng tư không?',
    faqPrivacyText:
      'Không. EXIF, IPTC, các thuộc tính XMP khác và nội dung trong ảnh có thể tiếp tục chứa thông tin cá nhân. Lựa chọn xóa metadata ngoài XMP chỉ bỏ những khối được hỗ trợ. Công cụ xóa metadata riêng có báo cáo giữ và xóa rõ hơn cho mục tiêu bảo vệ riêng tư.',
    faqSupport: 'Những ảnh nào chưa chỉnh sửa được?',
    faqSupportText:
      'Chưa hỗ trợ GIF, HEIC, AVIF, TIFF, ảnh raw, JPEG XL, HDR gain map, JPEG nhiều ảnh, JPEG chứa JUMBF, nhiều gói XMP hoặc Extended XMP. XML sai cấu trúc, quá lớn hoặc có dạng chưa hỗ trợ sẽ bị từ chối. File gốc không bị ghi đè.',
    large:
      'Ảnh vượt quá 100 MiB hoặc XMP sau giải nén vượt quá 1 MiB. Không tạo ảnh mới.',
    invalidField:
      'Giá trị mới chưa hợp lệ. Kiểm tra trường được đánh dấu và hướng dẫn bên dưới.',
    sourceXmp: 'XMP đang có trong ảnh',
    newXmp:
      'Ảnh chưa có XMP. Giữ nguyên mọi trường sẽ giữ nguyên file. Nhập một trường để tạo XMP.',
    unsupported:
      'Định dạng hoặc cấu trúc metadata này chưa được hỗ trợ để chỉnh sửa an toàn. Bạn vẫn có thể dùng công cụ đọc metadata.',
    invalid:
      'File hoặc XMP chưa hợp lệ. Kiểm tra XML, ngày, đánh giá và dung lượng. Chưa tạo ảnh mới.',
    unsafe:
      'Ảnh có nhiều gói XMP, Extended XMP, HDR hoặc cấu trúc chưa hỗ trợ. Công cụ không tạo ảnh mới để tránh làm mất dữ liệu.',
    footerReader: 'Đọc metadata file',
    footerCleaner: 'Xóa metadata ảnh',
  },
  en: {
    title: 'Edit image metadata',
    description:
      'Add, edit or remove XMP information in JPEG, PNG and WebP in your browser. Preserve the original compressed image data.',
    types: 'JPEG, PNG and WebP. Up to 100 MiB per image.',
    empty: 'Choose an image to inspect its metadata and start editing.',
    editTitle: 'Information to edit',
    editHint:
      'These fields belong to XMP. Other fields are preserved. Typing selects Set value. Removing a field removes the whole property, including other language versions.',
    exifHint:
      'EXIF and IPTC are preserved by default. Editing an author or date in XMP does not also edit EXIF or IPTC. Inspect the metadata groups to compare them.',
    actions: {
      keep: 'Keep original',
      set: 'Set value',
      remove: 'Remove field',
    },
    labels: {
      title: 'Title',
      description: 'Description',
      creator: 'Authors',
      rights: 'Copyright information',
      subject: 'Keywords',
      CreateDate: 'Creation date',
      ModifyDate: 'Content modification date',
      MetadataDate: 'Metadata modification date',
      CreatorTool: 'Creator software',
      Rating: 'Rating',
      Label: 'Label',
    },
    listHint: 'Enter each author or keyword on a separate line.',
    dateHint:
      'Enter a date such as 2026-10-06 or a time such as 2026-10-06T14:30:00+07:00. The current time is never added automatically.',
    ratingHint: 'Enter 0 to 5. The value -1 marks a rejected image.',
    resetEdits: 'Restore original values',
    removeAll: 'Remove all XMP',
    removeAllHint:
      'Remove properties outside this form too. Form edits will not be written.',
    removeOther: 'Remove metadata outside XMP',
    removeOtherHint:
      'Remove supported private EXIF, IPTC, text, thumbnails and optional blocks. Preserve necessary orientation, color, transparency and animation information.',
    credentials:
      'This image contains a C2PA origin claim. The tool removes it when metadata changes. It does not sign the image again or certify its origin.',
    process: 'Create image with new metadata',
    xmlProcess: 'Create image from edited XML',
    advanced: 'Edit XMP as XML',
    advancedHint:
      'For properties outside this form. The button below applies only the XML and the choice to remove metadata outside XMP. It does not apply form edits. XML is never executed and embedded links are never visited.',
    xmlLabel: 'XMP content',
    xmlHint:
      'Up to 1 MiB. DTD declarations, XML entities and changes to orientation or color hints are rejected.',
    downloadXmp: 'Download entered XMP',
    original: 'Original image metadata',
    processed: 'New image metadata',
    ready:
      'Image read. Every field keeps its original value until you edit it.',
    working: 'Writing metadata and checking image data.',
    done: 'Copy created. Compressed image data is identical byte for byte.',
    outputTitle: 'Image with new metadata',
    unchanged:
      'No changes. The copy is identical to the original file byte for byte.',
    changedSize: 'Size difference',
    remaining:
      'Information outside the editing scope may still remain in the image. Use the metadata cleaner if your goal is to reduce private information.',
    coverage:
      'Edit 11 common XMP properties or a standard XML packet. EXIF, IPTC and other metadata are read for comparison. Proprietary binary tags are not directly edited.',
    faqScope: 'Which information can be edited?',
    faqScopeText:
      'The form supports XMP titles, descriptions, author lists, copyright information, keywords, three date fields, creator software, rating and label. The XML editor supports additional XMP properties. Keep original leaves the property untouched. Set value replaces the complete property value. Remove field removes only the corresponding XMP property.',
    faqQuality: 'Does image quality change?',
    faqQualityText:
      'The tool never decodes and recompresses your image. It preserves compressed image data, dimensions, color, orientation, transparency and animation frames. Metadata is packaged again, so size may increase or decrease with your edits.',
    faqPrivacy: 'Does editing remove all private information?',
    faqPrivacyText:
      'No. EXIF, IPTC, other XMP properties and the image content may still contain personal information. The choice to remove metadata outside XMP removes only supported optional blocks. The separate metadata cleaner reports retained and removed information for privacy cleanup.',
    faqSupport: 'Which images cannot be edited yet?',
    faqSupportText:
      'GIF, HEIC, AVIF, TIFF, raw images, JPEG XL, HDR gain maps, multiple-image JPEG, JPEG containing JUMBF, multiple XMP packets and Extended XMP are not supported. Invalid, oversized or unsupported XML structures are rejected. Original files are never overwritten.',
    large:
      'The image exceeds 100 MiB or the decompressed XMP exceeds 1 MiB. No new image was created.',
    invalidField:
      'A new value is invalid. Check the marked field and its guidance.',
    sourceXmp: 'Existing image XMP',
    newXmp:
      'This image has no XMP. Keeping all fields preserves the file. Enter a field to create XMP.',
    unsupported:
      'This format or metadata structure is not supported for safe editing. You can still use the metadata reader.',
    invalid:
      'The file or XMP is invalid. Check XML, dates, rating and size. No new image was created.',
    unsafe:
      'This image contains multiple XMP packets, Extended XMP, HDR or an unsupported structure. No new image was created to avoid losing data.',
    footerReader: 'Read file metadata',
    footerCleaner: 'Remove image metadata',
  },
} as const;
