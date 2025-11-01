import React, { useState } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import {
  Button,
  Modal,
  Portal,
  Text,
  useTheme,
  Checkbox,
} from "react-native-paper";

export interface DropdownOption {
  label: string;
  value: string;
}

// overloads
interface SingleSelectProps {
  label: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  multiSelect?: false;
}

interface MultiSelectProps {
  label: string;
  options: DropdownOption[];
  value: string[];
  onChange: (value: string[]) => void;
  multiSelect: true;
}

type DropdownModalProps = SingleSelectProps | MultiSelectProps;

const DropdownModal: React.FC<DropdownModalProps> = ({
  label,
  options,
  value,
  onChange,
  multiSelect = false,
}) => {
  const [visible, setVisible] = useState(false);
  const theme = useTheme();

  const selectedValues: string[] = multiSelect
    ? (value as string[])
    : [value as string];
  const displayText = multiSelect
    ? value.length > 0
      ? `${value.length} selected`
      : "Select"
    : options.find((opt) => opt.value === value)?.label || "Select";

  const toggleValue = (v: string) => {
    if (!multiSelect) {
      (onChange as (val: string) => void)(v);
      setVisible(false);
    } else {
      const newValues = selectedValues.includes(v)
        ? selectedValues.filter((item) => item !== v)
        : [...selectedValues, v];
      (onChange as (val: string[]) => void)(newValues);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.onBackground }]}>
        {label}
      </Text>
      <Button
        mode="outlined"
        onPress={() => setVisible(true)}
        style={styles.button}
        textColor={theme.colors.onBackground}
      >
        {displayText}
      </Button>

      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentContainerStyle={[
            styles.modalContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => {
              const isSelected = selectedValues.includes(item.value);
              return (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => toggleValue(item.value)}
                >
                  {multiSelect && (
                    <Checkbox
                      status={isSelected ? "checked" : "unchecked"}
                      onPress={() => toggleValue(item.value)}
                    />
                  )}
                  <Text style={{ color: theme.colors.onSurface }}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          {multiSelect && (
            <Button
              mode="contained"
              style={{ marginTop: 10 }}
              onPress={() => setVisible(false)}
            >
              Done
            </Button>
          )}
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  label: { marginBottom: 4, fontWeight: "500" },
  button: { justifyContent: "space-between" },
  modalContainer: {
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 10,
    maxHeight: 400,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
});

export default DropdownModal;
