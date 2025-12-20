-- Fix integer overflow in page_metrics table
-- The total_time_on_page column was INTEGER (32-bit) which overflows when accumulating milliseconds
-- Changing to BIGINT (64-bit) to handle larger values

-- Alter the column type from INTEGER to BIGINT
ALTER TABLE page_metrics 
ALTER COLUMN total_time_on_page TYPE BIGINT;

-- Also fix total_views if it might overflow (unlikely but safe)
ALTER TABLE page_metrics 
ALTER COLUMN total_views TYPE BIGINT;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'page_metrics' 
AND column_name IN ('total_time_on_page', 'total_views');
