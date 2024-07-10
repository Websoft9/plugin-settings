import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

const TagsInput = forwardRef(({ initialTags, onTagsChange, isEditable, onPendingInputChange }, ref) => {
    const [tags, setTags] = useState(initialTags);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        setTags(initialTags);
    }, [initialTags]);

    const handleTagsChange = (event, newValue) => {
        setTags(newValue);
        onTagsChange(newValue);
    };

    const handleInputChange = (event, newInputValue) => {
        setInputValue(newInputValue);
        onPendingInputChange(newInputValue !== '');
    };

    useImperativeHandle(ref, () => ({
        clearInput: () => {
            setInputValue('');
            onPendingInputChange(false);
        }
    }));

    return (
        <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={tags}
            inputValue={inputValue}
            onChange={handleTagsChange}
            onInputChange={handleInputChange}
            renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                    <Chip
                        variant="outlined"
                        label={option}
                        {...getTagProps({ index })}
                        onDelete={isEditable ? getTagProps({ index }).onDelete : undefined}
                    />
                ))
            }
            renderInput={(params) => (
                <TextField
                    {...params}
                    variant="outlined"
                    disabled={!isEditable}
                />
            )}
            disabled={!isEditable}
        />
    );
});

export default TagsInput;
