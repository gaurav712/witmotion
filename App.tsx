import React, {useEffect, useState} from 'react';
import BleManager from 'react-native-ble-manager';
import {
  NativeModules,
  NativeEventEmitter,
  Text,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const sensor1Id = 'E8:96:68:03:A1:5E';
const sensor2Id = 'EE:29:F5:3F:06:A1';

const notifyCharacteristicUuid = '0000ffe4-0000-1000-8000-00805f9a34fb';
const notifyServiceUuid = '0000ffe5-0000-1000-8000-00805f9a34fb';

export default function App() {
  const [sensor1Readings, setSensor1Readings] = useState({
    x: 0,
    y: 0,
    z: 0,
    roll: 0,
    pitch: 0,
    yaw: 0,
  });
  const [sensor2Readings, setSensor2Readings] = useState({
    x: 0,
    y: 0,
    z: 0,
    roll: 0,
    pitch: 0,
    yaw: 0,
  });

  async function connectAndPrepare(
    peripheral: string,
    service: string,
    characteristic: string,
    updateValueCallback: (_: any) => void,
  ) {
    // Connect to device
    await BleManager.connect(peripheral);
    // Before startNotification you need to call retrieveServices
    await BleManager.retrieveServices(peripheral);
    // To enable BleManagerDidUpdateValueForCharacteristic listener
    await BleManager.startNotification(peripheral, service, characteristic);
    // Add event listener
    bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      updateValueCallback,
    );
  }

  const parseInt2complement = (bitstring: string, bitcount: number) => {
    let value = parseInt(bitstring, 2);

    if ((value & (1 << (bitcount - 1))) > 0) {
      value = value - (1 << bitcount);
    }
    return value;
  };

  const dec2bin = (dec: number) => {
    return (dec >>> 0).toString(2);
  };

  const wrapValue = (value: string) => {
    if (Number(value) > 1) {
      return 1;
    }
    if (Number(value) < -1) {
      return -1;
    }
    return value;
  };

  const onUpdateValue = ({value, peripheral}: any) => {
    const axH = value[3];
    const axL = value[2];
    const ayH = value[5];
    const ayL = value[4];
    const azH = value[7];
    const azL = value[6];

    const rollH = value[15];
    const rollL = value[14];
    const pitchH = value[17];
    const pitchL = value[16];
    const yawH = value[19];
    const yawL = value[18];

    const valueToUpdate = {
      x: wrapValue(
        (
          (parseInt2complement(dec2bin((axH << 8) | axL), 16) / 32768) *
          16
        ).toFixed(3),
      ),
      y: wrapValue(
        (
          (parseInt2complement(dec2bin((ayH << 8) | ayL), 16) / 32768) *
          16
        ).toFixed(3),
      ),
      z: wrapValue(
        (
          (parseInt2complement(dec2bin((azH << 8) | azL), 16) / 32768) *
          16
        ).toFixed(3),
      ),
      roll: wrapValue(
        (
          (parseInt2complement(dec2bin((rollH << 8) | rollL), 16) / 32768) *
          180
        ).toFixed(3),
      ),
      pitch: wrapValue(
        (
          (parseInt2complement(dec2bin((pitchH << 8) | pitchL), 16) / 32768) *
          180
        ).toFixed(3),
      ),
      yaw: wrapValue(
        (
          (parseInt2complement(dec2bin((yawH << 8) | yawL), 16) / 32768) *
          180
        ).toFixed(3),
      ),
    };

    if (peripheral === sensor1Id) {
      // @ts-ignore
      setSensor1Readings(valueToUpdate);
    } else {
      // @ts-ignore
      setSensor2Readings(valueToUpdate);
    }
  };

  const start = async () => {
    await BleManager.start({showAlert: false});
    console.log('Init the module success');
    await BleManager.scan([], 2, true);
    setTimeout(() => BleManager.stopScan(), 2100);
  };

  const init = async () => {
    await start();

    setTimeout(async () => {
      console.log('Now connecting');
      connectAndPrepare(
        sensor1Id,
        notifyServiceUuid,
        notifyCharacteristicUuid,
        onUpdateValue,
      );
      connectAndPrepare(
        sensor2Id,
        notifyServiceUuid,
        notifyCharacteristicUuid,
        onUpdateValue,
      );
    }, 3000);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.visualAngleContainer}>
        <View
          style={[
            styles.axis1Red,
            {
              transform: [
                {
                  rotate: `${(
                    Math.acos(Number(sensor1Readings.y)) * 57.29578
                  ).toFixed(0)}deg`,
                },
                {translateY: -50},
              ],
            },
          ]}
        />
        <View style={styles.originDot} />
        <View
          style={[
            styles.axis2Yellow,
            {
              transform: [
                {
                  rotate: `${(
                    Math.acos(Number(sensor2Readings.y)) * 57.29578
                  ).toFixed(0)}deg`,
                },
                {translateY: -50},
              ],
            },
          ]}
        />
      </View>
      <Text style={styles.angleText}>
        {(
          Number((Math.acos(Number(sensor1Readings.y)) * 57.29578).toFixed(1)) -
          Number((Math.acos(Number(sensor2Readings.y)) * 57.29578).toFixed(1))
        ).toFixed(1)}
        °
      </Text>
      <View style={styles.readingsContainer}>
        <View style={styles.readings}>
          <Text style={styles.sensor1Text}>{sensor1Id}</Text>
          <View style={[styles.colorMapping, {backgroundColor: 'red'}]} />
          <Text style={styles.text}>X: {sensor1Readings.x}</Text>
          <Text style={styles.text}>Y: {sensor1Readings.y}</Text>
          <Text style={styles.text}>Z: {sensor1Readings.z}</Text>
          <Text style={styles.text}>Roll (X): {sensor1Readings.roll}°</Text>
          <Text style={styles.text}>Pitch (Y): {sensor1Readings.pitch}°</Text>
          <Text style={styles.text}>Yaw (Z): {sensor1Readings.yaw}°</Text>
        </View>
        <View style={styles.readings}>
          <Text style={styles.sensor2Text}>{sensor2Id}</Text>
          <View style={[styles.colorMapping, {backgroundColor: 'yellow'}]} />
          <Text style={styles.text}>X: {sensor2Readings.x}</Text>
          <Text style={styles.text}>Y: {sensor2Readings.y}</Text>
          <Text style={styles.text}>Z: {sensor2Readings.z}</Text>
          <Text style={styles.text}>Roll (X): {sensor2Readings.roll}°</Text>
          <Text style={styles.text}>Pitch (Y): {sensor2Readings.pitch}°</Text>
          <Text style={styles.text}>Yaw (Z): {sensor2Readings.yaw}°</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontFamily: 'monospace',
  },
  angleText: {
    fontFamily: 'monospace',
    width: '80%',
    fontSize: 40,
    textAlign: 'center',
    marginBottom: 50,
  },
  visualAngleContainer: {
    marginBottom: 100,
    marginLeft: -50,
  },
  originDot: {
    position: 'absolute',
    top: 40,
    left: -10,
    height: 20,
    width: 20,
    backgroundColor: 'green',
    elevation: 10,
    borderRadius: 10,
  },
  axis1Red: {
    height: 100,
    width: 2,
    backgroundColor: 'red',
  },
  axis2Yellow: {
    height: 100,
    width: 2,
    backgroundColor: 'yellow',
    marginTop: -100,
  },
  sensor1Text: {
    fontFamily: 'monospace',
    marginBottom: 5,
  },
  sensor2Text: {
    fontFamily: 'monospace',
    marginBottom: 5,
  },
  readingsContainer: {
    flexDirection: 'row',
  },
  readings: {
    width: '50%',
    alignItems: 'center',
  },
  colorMapping: {
    width: 80,
    height: 2,
    marginVertical: 10,
  },
});
