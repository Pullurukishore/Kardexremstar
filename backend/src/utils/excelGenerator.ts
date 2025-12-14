import { Response } from 'express';
import { format } from 'date-fns';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

export interface ColumnDefinition {
    key: string;
    header: string;
    format?: (value: any, item?: any) => string | number;
    dataType?: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'duration';
    width?: number;
}

// Professional color scheme matching Kardex Remstar branding
const COLORS = {
    // Primary brand colors
    brandPrimary: '1E3A8A',    // Deep blue
    brandSecondary: '3B82F6',  // Bright blue
    brandAccent: 'DC2626',     // Red accent (Kardex red)

    // UI colors
    headerBg: '1E3A8A',
    headerText: 'FFFFFF',
    titleBg: 'EFF6FF',
    titleText: '1E40AF',

    // Table colors
    tableHeader: '1E40AF',
    tableHeaderText: 'FFFFFF',
    rowEven: 'F8FAFC',
    rowOdd: 'FFFFFF',
    borderLight: 'E2E8F0',
    borderDark: 'CBD5E1',

    // Text colors
    textDark: '1E293B',
    textMedium: '475569',
    textLight: '64748B',

    // Status colors
    success: '059669',
    warning: 'D97706',
    danger: 'DC2626',
    info: '0284C7',
};

// Helper to safely format values
function formatExcelValue(value: any, column: ColumnDefinition, item?: any): any {
    if (value === null || value === undefined || value === '') return '-';

    if (column.format) {
        try {
            const result = column.format(value, item);
            return result === null || result === undefined ? '-' : result;
        } catch (e) {
            return String(value);
        }
    }

    switch (column.dataType) {
        case 'number':
            const numValue = Number(value);
            return isNaN(numValue) ? String(value) : numValue;
        case 'currency':
            const currValue = Number(value);
            return isNaN(currValue) ? String(value) : currValue;
        case 'percentage':
            const pctValue = Number(value);
            return isNaN(pctValue) ? String(value) : pctValue / 100;
        case 'duration':
            // Format minutes as "Xh Xm"
            const minutes = Number(value);
            if (isNaN(minutes) || minutes <= 0) return '-';
            const hours = Math.floor(minutes / 60);
            const mins = Math.round(minutes % 60);
            if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
            if (hours > 0) return `${hours}h`;
            return `${mins}m`;
        case 'date':
            if (value instanceof Date) return value;
            if (typeof value === 'string' && !isNaN(Date.parse(value))) {
                return new Date(value);
            }
            return String(value);
        default:
            return String(value);
    }
}

// Helper to get nested object values
function getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return '';
    return path.split('.').reduce((current, key) => {
        if (current && typeof current === 'object' && key in current) {
            return current[key];
        }
        return '';
    }, obj);
}

// Main export function
export const generateExcel = async (
    res: Response,
    data: any[],
    columns: ColumnDefinition[],
    title: string,
    filters: { [key: string]: any },
    summaryData?: any
): Promise<void> => {
    try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'KardexCare System';
        workbook.lastModifiedBy = 'KardexCare Reports';
        workbook.created = new Date();
        workbook.modified = new Date();
        workbook.properties.date1904 = false;

        const worksheet = workbook.addWorksheet('Report', {
            properties: {
                tabColor: { argb: COLORS.brandPrimary },
                defaultRowHeight: 18
            },
            pageSetup: {
                paperSize: 9,
                orientation: 'landscape',
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0,
                margins: {
                    left: 0.5,
                    right: 0.5,
                    top: 0.75,
                    bottom: 0.75,
                    header: 0.3,
                    footer: 0.3
                }
            }
        });

        // Helper to convert column number to Excel letter (1=A, 27=AA, etc.)
        const getColumnLetter = (colNum: number): string => {
            let letter = '';
            while (colNum > 0) {
                const mod = (colNum - 1) % 26;
                letter = String.fromCharCode(65 + mod) + letter;
                colNum = Math.floor((colNum - 1) / 26);
            }
            return letter;
        };

        // Ensure we have valid columns
        const validColumns = columns.length > 0 ? columns : getExcelColumns('default');
        const colCount = validColumns.length;
        const lastColLetter = getColumnLetter(colCount);

        let currentRow = 1;

        // ==================================================
        // HEADER SECTION - Logo and Company Info
        // ==================================================

        // Try to add logo
        const logoPath = path.join(__dirname, '..', 'assets', 'kardex-logo.png');
        const frontendLogoPath = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'kardex.png');

        let logoAdded = false;
        for (const logoFile of [logoPath, frontendLogoPath]) {
            if (fs.existsSync(logoFile)) {
                try {
                    const imageId = workbook.addImage({
                        filename: logoFile,
                        extension: 'png',
                    });
                    worksheet.addImage(imageId, {
                        tl: { col: 0, row: 0 },
                        ext: { width: 150, height: 45 }
                    });
                    logoAdded = true;
                    break;
                } catch (e) {
                    console.log('Could not add logo to Excel:', e);
                }
            }
        }

        // Company name (if logo not added)
        worksheet.getRow(currentRow).height = 35;
        worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
        const companyCell = worksheet.getCell(`A${currentRow}`);
        if (!logoAdded) {
            companyCell.value = 'KARDEX REMSTAR';
            companyCell.font = { size: 20, bold: true, color: { argb: COLORS.brandPrimary } };
        }
        companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
        currentRow++;

        // Tagline with generation date
        worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
        const taglineCell = worksheet.getCell(`A${currentRow}`);
        taglineCell.value = `Service Management System | Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`;
        taglineCell.font = { size: 10, color: { argb: COLORS.textMedium }, italic: true };
        taglineCell.alignment = { horizontal: 'center', vertical: 'middle' };
        currentRow += 2;

        // ==================================================
        // REPORT TITLE SECTION
        // ==================================================
        worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
        const titleCell = worksheet.getCell(`A${currentRow}`);
        titleCell.value = title.toUpperCase();
        titleCell.font = { size: 16, bold: true, color: { argb: COLORS.titleText } };
        titleCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.titleBg }
        };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.border = {
            top: { style: 'medium', color: { argb: COLORS.brandPrimary } },
            bottom: { style: 'medium', color: { argb: COLORS.brandPrimary } }
        };
        worksheet.getRow(currentRow).height = 28;
        currentRow += 2;

        // ==================================================
        // FILTERS SECTION
        // ==================================================
        if (filters.from && filters.to) {
            const fromDate = format(new Date(filters.from), 'dd MMM yyyy');
            const toDate = format(new Date(filters.to), 'dd MMM yyyy');
            worksheet.getCell(`A${currentRow}`).value = 'Report Period:';
            worksheet.getCell(`A${currentRow}`).font = { size: 10, bold: true, color: { argb: COLORS.textMedium } };
            worksheet.getCell(`B${currentRow}`).value = `${fromDate} to ${toDate}`;
            worksheet.getCell(`B${currentRow}`).font = { size: 10, color: { argb: COLORS.brandPrimary } };
            currentRow++;
        }

        if (filters.zoneName || filters.zone) {
            worksheet.getCell(`A${currentRow}`).value = 'Zone:';
            worksheet.getCell(`A${currentRow}`).font = { size: 10, bold: true, color: { argb: COLORS.textMedium } };
            worksheet.getCell(`B${currentRow}`).value = filters.zoneName || filters.zone || 'All Zones';
            worksheet.getCell(`B${currentRow}`).font = { size: 10, color: { argb: COLORS.textDark } };
            currentRow++;
        }

        if (filters.reportType) {
            worksheet.getCell(`A${currentRow}`).value = 'Report Type:';
            worksheet.getCell(`A${currentRow}`).font = { size: 10, bold: true, color: { argb: COLORS.textMedium } };
            worksheet.getCell(`B${currentRow}`).value = filters.reportType.replace(/-/g, ' ').toUpperCase();
            worksheet.getCell(`B${currentRow}`).font = { size: 10, color: { argb: COLORS.textDark } };
            currentRow++;
        }
        currentRow++;

        // ==================================================
        // DATA TABLE SECTION
        // ==================================================

        // Table title
        worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
        const tableHeader = worksheet.getCell(`A${currentRow}`);
        tableHeader.value = `DATA (${data.length} Records)`;
        tableHeader.font = { size: 11, bold: true, color: { argb: COLORS.headerText } };
        tableHeader.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.headerBg }
        };
        tableHeader.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(currentRow).height = 22;
        currentRow++;

        // Column headers
        const headerRowNum = currentRow;
        const headerRow = worksheet.getRow(currentRow);
        headerRow.height = 26;

        validColumns.forEach((column, index) => {
            const cell = headerRow.getCell(index + 1);
            cell.value = column.header;
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: COLORS.tableHeader }
            };
            cell.font = { bold: true, color: { argb: COLORS.tableHeaderText }, size: 10 };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = {
                top: { style: 'thin', color: { argb: COLORS.headerBg } },
                left: { style: 'thin', color: { argb: COLORS.headerBg } },
                bottom: { style: 'thin', color: { argb: COLORS.headerBg } },
                right: { style: 'thin', color: { argb: COLORS.headerBg } }
            };

            // Set column width
            const col = worksheet.getColumn(index + 1);
            col.width = column.width || 15;
        });
        currentRow++;

        // Data rows
        if (data.length === 0) {
            worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
            const noDataCell = worksheet.getCell(`A${currentRow}`);
            noDataCell.value = 'No data available for the selected criteria';
            noDataCell.font = { size: 11, color: { argb: COLORS.textMedium }, italic: true };
            noDataCell.alignment = { horizontal: 'center', vertical: 'middle' };
            noDataCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: COLORS.rowEven }
            };
            worksheet.getRow(currentRow).height = 30;
            currentRow++;
        } else {
            data.forEach((item, rowIndex) => {
                const dataRow = worksheet.getRow(currentRow);
                dataRow.height = 20;
                const isEven = rowIndex % 2 === 0;

                validColumns.forEach((column, colIndex) => {
                    const cell = dataRow.getCell(colIndex + 1);
                    const rawValue = getNestedValue(item, column.key);
                    const formattedValue = formatExcelValue(rawValue, column, item);

                    cell.value = formattedValue;

                    // Background color
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: isEven ? COLORS.rowEven : COLORS.rowOdd }
                    };

                    // Number formatting
                    switch (column.dataType) {
                        case 'currency':
                            cell.numFmt = '"₹"#,##0.00';
                            break;
                        case 'percentage':
                            cell.numFmt = '0.00%';
                            break;
                        case 'date':
                            cell.numFmt = 'dd-mmm-yyyy';
                            break;
                        case 'number':
                            cell.numFmt = '#,##0.00';
                            break;
                    }

                    // Borders
                    cell.border = {
                        top: { style: 'thin', color: { argb: COLORS.borderLight } },
                        left: { style: 'thin', color: { argb: COLORS.borderLight } },
                        bottom: { style: 'thin', color: { argb: COLORS.borderLight } },
                        right: { style: 'thin', color: { argb: COLORS.borderLight } }
                    };

                    // Alignment based on data type
                    cell.alignment = {
                        horizontal: column.dataType === 'currency' || column.dataType === 'number' ? 'right' :
                            column.dataType === 'date' ? 'center' :
                                colIndex === 0 ? 'left' : 'center',
                        vertical: 'middle'
                    };

                    cell.font = { size: 9, color: { argb: COLORS.textDark } };
                });
                currentRow++;
            });
        }

        // ==================================================
        // FOOTER SECTION
        // ==================================================
        currentRow++;
        worksheet.mergeCells(`A${currentRow}:${lastColLetter}${currentRow}`);
        const footerCell = worksheet.getCell(`A${currentRow}`);
        footerCell.value = `© ${new Date().getFullYear()} Kardex Remstar India Pvt. Ltd. | This report is confidential.`;
        footerCell.font = { size: 8, color: { argb: COLORS.textLight }, italic: true };
        footerCell.alignment = { horizontal: 'center', vertical: 'middle' };

        // ==================================================
        // EXCEL FEATURES
        // ==================================================

        // Freeze panes - freeze row AFTER the column headers (headerRowNum is the header, freeze at headerRowNum + 1)
        // This keeps the column headers visible when scrolling
        worksheet.views = [{
            state: 'frozen',
            ySplit: headerRowNum,  // Freeze after this row
            xSplit: 0,             // Don't freeze any columns horizontally
            topLeftCell: 'A' + (headerRowNum + 1),
            activeCell: 'A' + (headerRowNum + 1)
        }];

        // Auto-filter on the column header row only
        if (data.length > 0) {
            worksheet.autoFilter = {
                from: { row: headerRowNum, column: 1 },
                to: { row: headerRowNum, column: validColumns.length }
            };
        }

        // Print settings
        worksheet.headerFooter.oddFooter = '&C&8Page &P of &N | Generated by KardexCare';

        // Set response headers
        const filename = `KardexCare-${title.replace(/[^a-zA-Z0-9]/g, '-')}-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Excel generation error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to generate Excel report' });
        }
    }
};

// Column definitions for all report types
export const getExcelColumns = (reportType: string): ColumnDefinition[] => {
    const columns: Record<string, ColumnDefinition[]> = {
        'offer-summary': [
            { key: 'offerReferenceNumber', header: 'Offer Ref #', width: 16 },
            { key: 'offerReferenceDate', header: 'Offer Date', width: 12, dataType: 'date' },
            { key: 'company', header: 'Company', width: 22 },
            { key: 'location', header: 'Location', width: 16 },
            { key: 'department', header: 'Department', width: 14 },
            { key: 'contactPersonName', header: 'Contact Person', width: 16 },
            { key: 'contactNumber', header: 'Contact No.', width: 14 },
            { key: 'email', header: 'Email', width: 22 },
            { key: 'productType', header: 'Product Type', width: 14 },
            { key: 'machineSerialNumber', header: 'Machine S/N', width: 16 },
            { key: 'lead', header: 'Lead', width: 10 },
            { key: 'stage', header: 'Stage', width: 14 },
            { key: 'status', header: 'Status', width: 12 },
            { key: 'priority', header: 'Priority', width: 10 },
            { key: 'offerValue', header: 'Offer Value (₹)', width: 14, dataType: 'currency' },
            { key: 'offerMonth', header: 'Offer Month', width: 12 },
            { key: 'probabilityPercentage', header: 'Probability %', width: 12, dataType: 'percentage' },
            { key: 'poExpectedMonth', header: 'PO Expected', width: 12 },
            { key: 'poNumber', header: 'PO Number', width: 16 },
            { key: 'poDate', header: 'PO Date', width: 12, dataType: 'date' },
            { key: 'poValue', header: 'PO Value (₹)', width: 14, dataType: 'currency' },
            { key: 'poReceivedMonth', header: 'PO Received', width: 12 },
            { key: 'zone.name', header: 'Zone', width: 12 },
            { key: 'assignedTo.name', header: 'Assigned To', width: 16 },
            { key: 'createdBy.name', header: 'Created By', width: 16 },
            { key: 'openFunnel', header: 'Open Funnel', width: 10 },
            { key: 'remarks', header: 'Remarks', width: 25 },
            { key: 'bookingDateInSap', header: 'SAP Booking', width: 12, dataType: 'date' },
            { key: 'createdAt', header: 'Created', width: 12, dataType: 'date' },
            { key: 'updatedAt', header: 'Updated', width: 12, dataType: 'date' },
        ],
        'ticket-summary': [
            { key: 'customer.companyName', header: 'Company Name', width: 22 },
            { key: 'asset.location', header: 'Place', width: 16 },
            { key: 'id', header: 'Ticket ID', width: 10, dataType: 'number' },
            { key: 'createdAt', header: 'Date', width: 12, dataType: 'date' },
            { key: 'asset.serialNo', header: 'Machine S/N', width: 16 },
            { key: 'callType', header: 'Call Type', width: 14 },
            { key: 'description', header: 'Error/Issue', width: 28 },
            { key: 'assignedTo.name', header: 'Responsible', width: 16 },
            { key: 'zone.name', header: 'Zone', width: 10 },
            { key: 'visitPlannedDate', header: 'Scheduled', width: 12, dataType: 'date' },
            { key: 'visitCompletedDate', header: 'Closed', width: 12, dataType: 'date' },
            { key: 'travelTime', header: 'Travel', width: 10, dataType: 'duration' },
            { key: 'onsiteWorkingTime', header: 'Onsite', width: 10, dataType: 'duration' },
            { key: 'actualResolutionTime', header: 'Res Time', width: 12, dataType: 'duration' },
            { key: 'status', header: 'Status', width: 12 },
        ],
        'target-report': [
            { key: 'zone.name', header: 'Zone', width: 16 },
            { key: 'userName', header: 'User', width: 18 },
            { key: 'targetPeriod', header: 'Period', width: 12 },
            { key: 'periodType', header: 'Type', width: 10 },
            { key: 'targetValue', header: 'Target', width: 14, dataType: 'currency' },
            { key: 'actualValue', header: 'Actual', width: 14, dataType: 'currency' },
            { key: 'achievement', header: 'Achievement', width: 12, dataType: 'percentage' },
        ],
        'zone-performance': [
            { key: 'name', header: 'Zone', width: 16 },
            { key: 'totalTickets', header: 'Total Tickets', width: 12, dataType: 'number' },
            { key: 'resolvedTickets', header: 'Resolved', width: 12, dataType: 'number' },
            { key: 'pendingTickets', header: 'Pending', width: 12, dataType: 'number' },
            { key: 'resolutionRate', header: 'Resolution %', width: 12, dataType: 'percentage' },
            { key: 'avgResolutionTime', header: 'Avg Time (hrs)', width: 14, dataType: 'number' },
        ],
        'agent-productivity': [
            { key: 'name', header: 'Agent Name', width: 20 },
            { key: 'email', header: 'Email', width: 24 },
            { key: 'totalTickets', header: 'Total Tickets', width: 12, dataType: 'number' },
            { key: 'resolvedTickets', header: 'Resolved', width: 12, dataType: 'number' },
            { key: 'avgResolutionTime', header: 'Avg Time (hrs)', width: 14, dataType: 'number' },
            { key: 'performanceScore', header: 'Score', width: 10, dataType: 'percentage' },
        ],
        'customer-performance': [
            { key: 'companyName', header: 'Customer', width: 24 },
            { key: 'totalTickets', header: 'Total Tickets', width: 12, dataType: 'number' },
            { key: 'totalOfferValue', header: 'Offer Value', width: 14, dataType: 'currency' },
            { key: 'totalPOValue', header: 'PO Value', width: 14, dataType: 'currency' },
            { key: 'zone.name', header: 'Zone', width: 12 },
        ],
        'product-type-analysis': [
            { key: 'productType', header: 'Product Type', width: 18 },
            { key: 'offerCount', header: 'Offers', width: 10, dataType: 'number' },
            { key: 'totalOfferValue', header: 'Offer Value', width: 14, dataType: 'currency' },
            { key: 'poCount', header: 'POs', width: 10, dataType: 'number' },
            { key: 'totalPOValue', header: 'PO Value', width: 14, dataType: 'currency' },
            { key: 'conversionRate', header: 'Conversion %', width: 12, dataType: 'percentage' },
        ],
        'default': [
            { key: 'id', header: 'ID', width: 10 },
            { key: 'name', header: 'Name', width: 20 },
            { key: 'status', header: 'Status', width: 12 },
            { key: 'value', header: 'Value', width: 14, dataType: 'currency' },
            { key: 'createdAt', header: 'Created', width: 12, dataType: 'date' },
        ]
    };

    return columns[reportType] || columns['default'];
};
