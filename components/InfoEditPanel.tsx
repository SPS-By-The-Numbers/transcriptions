'use client'
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import SpeakerInfoControl from 'components/SpeakerInfoControl';
import React from 'react';
import Typography from '@mui/material/Typography';

import type { CategoryId } from 'common/params';
import type { SxProps, Theme } from '@mui/material';
import type { ExistingNames, TagSet } from 'utilities/client/speaker';

type InfoEditPanelParams = {
  category: CategoryId;
  metadata: any;
  initialExistingNames: ExistingNames;
  initialExistingTags: TagSet;
  speakerNums : Set<number>;
  sx?: SxProps<Theme>;
};

type TabPanelProps = {
  children?: React.ReactNode;
  index: number;
  value: number;
};

function a11yProps(index: number) {
  return {
    id: `infoedit-tab-${index}`,
    'aria-controls': `infoedit-tabpanel-${index}`,
  };
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`infoedit-tabpanel-${index}`}
      aria-labelledby={`infoedit-tab-${index}`}
      sx={{overflowY: "scroll", height: "100%"}}
      {...other}
    >
      {value === index && <Box sx={{ py: 1 }}>{children}</Box>}
    </Box>
  );
}

export default function InfoEditPanel({
    category,
    metadata,
    speakerNums,
    initialExistingNames,
    initialExistingTags,
    sx=[]} : InfoEditPanelParams) {

  const [value, setValue] = React.useState(0);
  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    setValue(parseInt(newValue));
  };

  return (
    <Box 
        elevation={3}
      sx={[{paddingY: 0, height: "100%"}, ...(Array.isArray(sx) ? sx : [sx])]}>
      <Tabs
        value={value}
        onChange={handleChange}
        aria-label="Information ane Property Edit Panel">
         <Tab label="Info" {...a11yProps(0)} />
         <Tab label="Speakers" {...a11yProps(1)} />
      </Tabs>
      <CustomTabPanel value={value} index={0}>
        <section>
          Publish Date: {new Date(metadata.publish_date).toLocaleDateString()}
        </section>
        <section>
          Description: {metadata.description}
        </section>
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <SpeakerInfoControl
          category={category}
          speakerNums={speakerNums}
          videoId={metadata.video_id}
          initialExistingNames={initialExistingNames}
          initialExistingTags={initialExistingTags}
        />
      </CustomTabPanel>
    </Box>
  );
}
